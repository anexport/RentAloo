import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { formatDateForStorage } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import type { Database } from "@/lib/database.types";

type AvailabilityRecord = Database["public"]["Tables"]["availability_calendar"]["Row"];

export interface EquipmentAvailability {
  date: string;
  isAvailable: boolean;
  customRate?: number | null;
}

interface UseEquipmentAvailabilityProps {
  equipmentId?: string;
  enabled?: boolean;
}

// ============================================================================
// FETCH FUNCTION
// ============================================================================

const fetchAvailability = async (
  equipmentId: string
): Promise<Map<string, EquipmentAvailability>> => {
  // Fetch availability for the next 6 months
  const today = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(today.getMonth() + 6);

  const { data, error } = await supabase
    .from("availability_calendar")
    .select("*")
    .eq("equipment_id", equipmentId)
    .gte("date", formatDateForStorage(today))
    .lte("date", formatDateForStorage(sixMonthsFromNow));

  if (error) throw error;

  // Convert to Map for fast lookup
  const availabilityMap = new Map<string, EquipmentAvailability>();
  (data || []).forEach((record: AvailabilityRecord) => {
    availabilityMap.set(record.date, {
      date: record.date,
      isAvailable: record.is_available ?? true,
      customRate: record.custom_rate,
    });
  });

  return availabilityMap;
};

// ============================================================================
// HOOK: useEquipmentAvailability
// ============================================================================

export const useEquipmentAvailability = ({
  equipmentId,
  enabled = true,
}: UseEquipmentAvailabilityProps) => {
  // Query for fetching availability
  const {
    data: availabilityData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.availability.byEquipment(equipmentId ?? ""),
    queryFn: () => fetchAvailability(equipmentId!),
    enabled: !!equipmentId && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - availability changes relatively frequently
    // Keep previous data while fetching
    placeholderData: (previousData) => previousData,
  });

  // Memoize the availability Map to ensure stable reference
  const availability = useMemo<Map<string, EquipmentAvailability>>(
    () => availabilityData ?? new Map<string, EquipmentAvailability>(),
    [availabilityData]
  );

  // Helper to get availability for a specific date
  const getAvailabilityForDate = useCallback(
    (date: Date): EquipmentAvailability | undefined => {
      const dateStr = formatDateForStorage(date);
      return availability.get(dateStr);
    },
    [availability]
  );

  // Helper to check if a date is available
  const isDateAvailable = useCallback(
    (date: Date): boolean => {
      const dateStr = formatDateForStorage(date);
      const record = availability.get(dateStr);
      // If no record exists, assume available
      return record?.isAvailable ?? true;
    },
    [availability]
  );

  return {
    availability,
    loading: isLoading,
    error: error instanceof Error ? error : null,
    getAvailabilityForDate,
    isDateAvailable,
    refetch,
  };
};
