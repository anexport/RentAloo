import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TOTAL_STEPS } from "./hooks/useListingWizard";

interface WizardNavigationProps {
  currentStep: number;
  isSubmitting: boolean;
  isEditMode: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export default function WizardNavigation({
  currentStep,
  isSubmitting,
  isEditMode,
  onBack,
  onNext,
  onSubmit,
  onCancel,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;

  return (
    <div className="flex items-center justify-between gap-4 pt-6 border-t">
      {/* Left Side - Back / Cancel */}
      <div>
        {isFirstStep ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
      </div>

      {/* Right Side - Next / Submit */}
      <div className="flex items-center gap-3">
        {isLastStep ? (
          <Button type="button" onClick={onSubmit} disabled={isSubmitting} size="lg">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEditMode ? "Saving..." : "Publishing..."}
              </>
            ) : isEditMode ? (
              "Save Changes"
            ) : (
              "Publish Listing"
            )}
          </Button>
        ) : (
          <Button type="button" onClick={onNext} disabled={isSubmitting} size="lg">
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
