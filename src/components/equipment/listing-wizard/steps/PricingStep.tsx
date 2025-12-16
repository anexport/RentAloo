import { DollarSign, Percent, Shield, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import SmartTip from "../components/SmartTip";
import type { WizardFormData } from "../hooks/useListingWizard";

const REFUND_TIMELINES = [
  { value: 24, label: "24 hours", description: "Quick turnaround" },
  { value: 48, label: "48 hours", description: "Recommended" },
  { value: 72, label: "72 hours", description: "Standard review time" },
  { value: 168, label: "1 week", description: "Extended review" },
];

interface PricingStepProps {
  formData: WizardFormData;
  onUpdate: <K extends keyof WizardFormData>(field: K, value: WizardFormData[K]) => void;
}

export default function PricingStep({ formData, onUpdate }: PricingStepProps) {
  const dailyRate = Number(formData.daily_rate) || 0;
  const depositPercentage = Number(formData.damage_deposit_percentage) || 0;
  const calculatedDepositFromPercentage = dailyRate * (depositPercentage / 100);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Set your pricing</h2>
        <p className="text-muted-foreground">
          Choose a competitive daily rate and optional damage protection for your equipment.
        </p>
      </div>

      {/* Daily Rate */}
      <div className="space-y-4">
        <Label htmlFor="daily_rate" className="text-base font-medium">
          Daily rental rate
        </Label>
        <div className="relative max-w-xs">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            id="daily_rate"
            type="number"
            inputMode="decimal"
            min="1"
            step="0.01"
            value={formData.daily_rate}
            onChange={(e) =>
              onUpdate("daily_rate", e.target.value ? Number(e.target.value) : "")
            }
            placeholder="0.00"
            className="pl-10 text-2xl h-14 font-semibold"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            /day
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          You'll receive this amount minus a small service fee for each day rented.
        </p>
      </div>

      {/* Earnings Preview */}
      {dailyRate > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <h3 className="font-medium text-emerald-800 dark:text-emerald-300 mb-2">
            Estimated earnings
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                ${(dailyRate * 0.9).toFixed(0)}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">Per day</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                ${(dailyRate * 0.9 * 7).toFixed(0)}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">Per week</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                ${(dailyRate * 0.9 * 30).toFixed(0)}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">Per month</p>
            </div>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2 text-center">
            After 10% service fee (actual fee may vary)
          </p>
        </div>
      )}

      {/* Damage Deposit Section */}
      <div className="space-y-4 pt-6 border-t">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <Label className="text-base font-medium">Damage protection deposit</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Protect your equipment with a refundable deposit held during the rental period.
            </p>
          </div>
        </div>

        <RadioGroup
          value={formData.damage_deposit_type}
          onValueChange={(value) => {
            onUpdate("damage_deposit_type", value as "none" | "fixed" | "percentage");
            if (value === "none") {
              onUpdate("damage_deposit_amount", "");
              onUpdate("damage_deposit_percentage", "");
            }
          }}
          className="space-y-3"
        >
          {/* No Deposit */}
          <label
            htmlFor="deposit-none"
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
              formData.damage_deposit_type === "none"
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/30"
            )}
          >
            <RadioGroupItem value="none" id="deposit-none" />
            <div className="flex-1">
              <p className="font-medium text-foreground">No deposit required</p>
              <p className="text-sm text-muted-foreground">
                Trust-based rentals, may increase booking conversion
              </p>
            </div>
          </label>

          {/* Fixed Amount */}
          <label
            htmlFor="deposit-fixed"
            className={cn(
              "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
              formData.damage_deposit_type === "fixed"
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/30"
            )}
          >
            <RadioGroupItem value="fixed" id="deposit-fixed" className="mt-1" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="font-medium text-foreground">Fixed amount</p>
                <p className="text-sm text-muted-foreground">Set a specific deposit amount</p>
              </div>
              {formData.damage_deposit_type === "fixed" && (
                <div className="relative max-w-[200px]">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={formData.damage_deposit_amount}
                    onChange={(e) =>
                      onUpdate(
                        "damage_deposit_amount",
                        e.target.value ? Number(e.target.value) : ""
                      )
                    }
                    placeholder="100.00"
                    className="pl-9"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>
          </label>

          {/* Percentage */}
          <label
            htmlFor="deposit-percentage"
            className={cn(
              "flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
              formData.damage_deposit_type === "percentage"
                ? "border-primary bg-primary/5"
                : "border-muted hover:border-muted-foreground/30"
            )}
          >
            <RadioGroupItem value="percentage" id="deposit-percentage" className="mt-1" />
            <div className="flex-1 space-y-3">
              <div>
                <p className="font-medium text-foreground">Percentage of daily rate</p>
                <p className="text-sm text-muted-foreground">
                  Deposit scales with rental value
                </p>
              </div>
              {formData.damage_deposit_type === "percentage" && (
                <div className="space-y-2">
                  <div className="relative max-w-[200px]">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      value={formData.damage_deposit_percentage}
                      onChange={(e) =>
                        onUpdate(
                          "damage_deposit_percentage",
                          e.target.value ? Number(e.target.value) : ""
                        )
                      }
                      placeholder="50"
                      className="pr-9"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  {calculatedDepositFromPercentage > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Deposit will be{" "}
                      <span className="font-medium text-foreground">
                        ${calculatedDepositFromPercentage.toFixed(2)}
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </label>
        </RadioGroup>

        {/* Refund Timeline */}
        {formData.damage_deposit_type !== "none" && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Deposit refund timeline</Label>
            </div>
            <Select
              value={formData.deposit_refund_timeline_hours.toString()}
              onValueChange={(value) =>
                onUpdate("deposit_refund_timeline_hours", Number(value))
              }
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select timeline" />
              </SelectTrigger>
              <SelectContent>
                {REFUND_TIMELINES.map((timeline) => (
                  <SelectItem key={timeline.value} value={timeline.value.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{timeline.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({timeline.description})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Time after return before the deposit is automatically released to the renter.
            </p>
          </div>
        )}
      </div>

      {/* Smart Tip */}
      <SmartTip variant="info">
        <strong>Pricing tip:</strong> Research similar listings in your area to set competitive
        rates. Starting slightly lower can help you get initial reviews, which boost visibility.
      </SmartTip>
    </div>
  );
}
