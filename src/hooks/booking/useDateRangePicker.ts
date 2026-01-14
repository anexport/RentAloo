import { useState, useCallback } from "react";
import { differenceInDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface UseDateRangePickerProps {
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onStartDateSelect?: (date: Date | undefined) => void;
  onEndDateSelect?: (date: Date | undefined) => void;
}

export const useDateRangePicker = ({
  dateRange,
  onDateRangeChange,
  onStartDateSelect,
  onEndDateSelect,
}: UseDateRangePickerProps) => {
  const { t } = useTranslation("booking");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const handleStartDateSelect = useCallback(
    (date: Date | undefined) => {
      if (onStartDateSelect) {
        onStartDateSelect(date);
      } else {
        if (!date) {
          onDateRangeChange(undefined);
          setStartDateOpen(false);
          return;
        }

        const newRange: DateRange = {
          from: date,
          to: dateRange?.to,
        };
        onDateRangeChange(newRange);
        setStartDateOpen(false);
      }
    },
    [dateRange, onDateRangeChange, onStartDateSelect]
  );

  const handleEndDateSelect = useCallback(
    (date: Date | undefined) => {
      if (onEndDateSelect) {
        onEndDateSelect(date);
      } else {
        if (!date) {
          if (dateRange?.from) {
            onDateRangeChange({ from: dateRange.from, to: undefined });
          } else {
            onDateRangeChange(undefined);
          }
          setEndDateOpen(false);
          return;
        }

        if (!dateRange?.from) {
          onDateRangeChange({ from: date, to: undefined });
          setEndDateOpen(false);
          return;
        }

        const newRange: DateRange = {
          from: dateRange.from,
          to: date,
        };
        onDateRangeChange(newRange);
        setEndDateOpen(false);

        // Show toast when both dates are selected
        const days = differenceInDays(date, dateRange.from) + 1;
        toast.success(
          t("sidebar.dates_confirmed", "Dates confirmed!"),
          {
            description: t("sidebar.dates_confirmed_description", {
              start: format(dateRange.from, "MMM d"),
              end: format(date, "MMM d"),
              days,
              defaultValue: "{{start}} - {{end}} ({{days}} days)",
            }),
          }
        );
      }
    },
    [dateRange, onDateRangeChange, onEndDateSelect, t]
  );

  return {
    startDateOpen,
    setStartDateOpen,
    endDateOpen,
    setEndDateOpen,
    handleStartDateSelect,
    handleEndDateSelect,
  };
};

