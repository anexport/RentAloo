import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import type { Database } from "@/lib/database.types"

type BookingRequest = Database["public"]["Tables"]["booking_requests"]["Row"]
type EquipmentInspection = Database["public"]["Tables"]["equipment_inspections"]["Row"]
type Payment = Database["public"]["Tables"]["payments"]["Row"]
type DamageClaim = Database["public"]["Tables"]["damage_claims"]["Row"]
type Equipment = Database["public"]["Tables"]["equipment"]["Row"]

export type RentalStatus = BookingRequest["status"]

export interface BookingWithDetails extends BookingRequest {
  equipment: Equipment & {
    owner_id: string
  }
  renter: {
    id: string
    full_name: string | null
    email: string
  }
}

interface RentalState {
  // Current rental being viewed/managed
  currentRental: BookingWithDetails | null

  // Related data
  pickupInspection: EquipmentInspection | null
  returnInspection: EquipmentInspection | null
  payment: Payment | null
  damageClaim: DamageClaim | null

  // Computed helpers
  canCompletePickupInspection: boolean
  canStartRental: boolean
  canInitiateReturn: boolean
  canCompleteReturnInspection: boolean
  canOwnerConfirm: boolean
  canCancel: boolean
  isOwner: boolean
  isRenter: boolean

  // Loading/error state
  isLoading: boolean
  error: string | null
}

interface RentalActions {
  loadRental: (bookingId: string) => Promise<void>
  completePickupInspection: () => Promise<void>
  initiateReturn: () => Promise<void>
  completeReturnInspection: () => Promise<void>
  ownerConfirm: () => Promise<void>
  ownerReportDamage: (description: string, estimatedCost?: number) => Promise<void>
  cancelRental: (reason?: string) => Promise<void>
  clearRental: () => void
  refreshRental: () => Promise<void>
}

type RentalContextType = RentalState & RentalActions

const RentalContext = createContext<RentalContextType | null>(null)

const CANCELLABLE_STATUSES: RentalStatus[] = [
  "pending", "awaiting_pickup_inspection", "awaiting_start_date"
] as RentalStatus[]

export function RentalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [currentRental, setCurrentRental] = useState<BookingWithDetails | null>(null)
  const [pickupInspection, setPickupInspection] = useState<EquipmentInspection | null>(null)
  const [returnInspection, setReturnInspection] = useState<EquipmentInspection | null>(null)
  const [payment, setPayment] = useState<Payment | null>(null)
  const [damageClaim, setDamageClaim] = useState<DamageClaim | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Computed values
  const isOwner = Boolean(user && currentRental && user.id === currentRental.equipment.owner_id)
  const isRenter = Boolean(user && currentRental && user.id === currentRental.renter_id)

  const canCompletePickupInspection =
    currentRental?.status === "awaiting_pickup_inspection" &&
    isRenter &&
    Boolean(pickupInspection?.verified_by_renter)

  const canStartRental =
    currentRental?.status === "awaiting_start_date" &&
    new Date(currentRental.start_date) <= new Date()

  const canInitiateReturn =
    currentRental?.status === "active" &&
    isRenter

  const canCompleteReturnInspection =
    currentRental?.status === "awaiting_return_inspection" &&
    isRenter &&
    Boolean(returnInspection?.verified_by_renter)

  const canOwnerConfirm =
    currentRental?.status === "pending_owner_review" &&
    isOwner

  const canCancel =
    Boolean(currentRental && CANCELLABLE_STATUSES.includes(currentRental.status as RentalStatus))

  // Load rental data
  const loadRental = useCallback(async (bookingId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch booking with equipment and renter
      const { data: booking, error: bookingError } = await supabase
        .from("booking_requests")
        .select(`
          *,
          equipment:equipment_id (*),
          renter:renter_id (id, full_name, email)
        `)
        .eq("id", bookingId)
        .single()

      if (bookingError) throw bookingError
      setCurrentRental(booking as unknown as BookingWithDetails)

      // Fetch inspections
      const { data: inspections } = await supabase
        .from("equipment_inspections")
        .select("*")
        .eq("booking_id", bookingId)

      if (inspections) {
        setPickupInspection(inspections.find(i => i.inspection_type === "pickup") || null)
        setReturnInspection(inspections.find(i => i.inspection_type === "return") || null)
      }

      // Fetch payment
      const { data: paymentData } = await supabase
        .from("payments")
        .select("*")
        .eq("booking_request_id", bookingId)
        .single()

      setPayment(paymentData)

      // Fetch damage claim if disputed
      if (booking.status === "disputed") {
        const { data: claim } = await supabase
          .from("damage_claims")
          .select("*")
          .eq("booking_id", bookingId)
          .single()

        setDamageClaim(claim)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rental")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Transition helper
  const transitionRental = useCallback(async (
    action: string,
    data?: Record<string, unknown>
  ) => {
    if (!currentRental) {
      throw new Error("No rental loaded")
    }

    const { data: result, error } = await supabase.functions.invoke(
      "transition-rental-state",
      {
        body: {
          booking_id: currentRental.id,
          action,
          data,
        },
      }
    )

    if (error) throw error
    if (!result.success) throw new Error(result.error)

    // Refresh data after successful transition
    await loadRental(currentRental.id)

    return result
  }, [currentRental, loadRental])

  // Action methods
  const completePickupInspection = useCallback(async () => {
    await transitionRental("complete_pickup_inspection")
  }, [transitionRental])

  const initiateReturn = useCallback(async () => {
    await transitionRental("initiate_return")
  }, [transitionRental])

  const completeReturnInspection = useCallback(async () => {
    await transitionRental("complete_return_inspection")
  }, [transitionRental])

  const ownerConfirm = useCallback(async () => {
    await transitionRental("owner_confirm")
  }, [transitionRental])

  const ownerReportDamage = useCallback(async (description: string, estimatedCost?: number) => {
    await transitionRental("owner_report_damage", { description, estimated_cost: estimatedCost })
  }, [transitionRental])

  const cancelRental = useCallback(async (reason?: string) => {
    await transitionRental("cancel", { reason })
  }, [transitionRental])

  const clearRental = useCallback(() => {
    setCurrentRental(null)
    setPickupInspection(null)
    setReturnInspection(null)
    setPayment(null)
    setDamageClaim(null)
    setError(null)
  }, [])

  const refreshRental = useCallback(async () => {
    if (currentRental) {
      await loadRental(currentRental.id)
    }
  }, [currentRental, loadRental])

  // Real-time subscription
  useEffect(() => {
    if (!currentRental) return

    const channel = supabase
      .channel(`rental-${currentRental.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "booking_requests",
          filter: `id=eq.${currentRental.id}`,
        },
        () => void refreshRental()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "equipment_inspections",
          filter: `booking_id=eq.${currentRental.id}`,
        },
        () => void refreshRental()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `booking_request_id=eq.${currentRental.id}`,
        },
        () => void refreshRental()
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [currentRental?.id, refreshRental])

  const value: RentalContextType = {
    currentRental,
    pickupInspection,
    returnInspection,
    payment,
    damageClaim,
    canCompletePickupInspection,
    canStartRental,
    canInitiateReturn,
    canCompleteReturnInspection,
    canOwnerConfirm,
    canCancel,
    isOwner,
    isRenter,
    isLoading,
    error,
    loadRental,
    completePickupInspection,
    initiateReturn,
    completeReturnInspection,
    ownerConfirm,
    ownerReportDamage,
    cancelRental,
    clearRental,
    refreshRental,
  }

  return (
    <RentalContext.Provider value={value}>
      {children}
    </RentalContext.Provider>
  )
}

export function useRental() {
  const context = useContext(RentalContext)
  if (!context) {
    throw new Error("useRental must be used within a RentalProvider")
  }
  return context
}
