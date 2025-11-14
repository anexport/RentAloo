import { useCallback, useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface CheckboxGroupProps {
  options: Array<{ value: string; label: string; description?: string }>;
  value: string[];
  onChange: (value: string[]) => void;
  label?: string;
  error?: string;
  columns?: number;
}

export const CheckboxGroup = ({
  options,
  value,
  onChange,
  label,
  error,
  columns = 2,
}: CheckboxGroupProps) => {
  const isTogglingRef = useRef<string | null>(null);
  const latestValueRef = useRef<string[]>(value);

  // Keep the ref updated with the latest value
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const handleToggle = useCallback(
    (optionValue: string) => {
      if (isTogglingRef.current === optionValue) {
        return;
      }

      isTogglingRef.current = optionValue;

      const currentValue = latestValueRef.current;
      const newValue = currentValue.includes(optionValue)
        ? currentValue.filter((v) => v !== optionValue)
        : [...currentValue, optionValue];

      onChange(newValue);

      // Clear the guard asynchronously to prevent sequential event handlers
      setTimeout(() => {
        isTogglingRef.current = null;
      }, 0);
    },
    [onChange]
  );

  return (
    <div className="space-y-3">
      {label && <Label className="text-base font-medium">{label}</Label>}
      <div
        className={cn(
          "grid gap-4",
          columns === 2 && "grid-cols-1 sm:grid-cols-2",
          columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {options.map((option) => (
          <div
            key={option.value}
            className={cn(
              "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-accent",
              value.includes(option.value) && "border-primary bg-accent"
            )}
            // Remove the onClick handler entirely
            // Let the checkbox's onCheckedChange handle the toggle
            role="group"
            aria-label={option.label}
          >
            <Checkbox
              id={option.value}
              checked={value.includes(option.value)}
              onCheckedChange={() => {
                handleToggle(option.value);
              }}
              aria-label={`Select ${option.label}`}
            />
            <div className="flex-1 space-y-1">
              <Label
                htmlFor={option.value}
                className="text-sm font-medium leading-none cursor-pointer"
              >
                {option.label}
              </Label>
              {option.description && (
                <p className="text-xs text-muted-foreground">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
