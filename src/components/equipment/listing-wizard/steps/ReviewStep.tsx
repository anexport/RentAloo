import {
  Camera,
  FileText,
  DollarSign,
  MapPin,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/database.types";
import type { WizardFormData, WizardPhoto } from "../hooks/useListingWizard";

interface ReviewStepProps {
  formData: WizardFormData;
  photos: WizardPhoto[];
  categories: Database["public"]["Tables"]["categories"]["Row"][];
  onEditStep: (step: number) => void;
}

const CONDITIONS: Record<string, string> = {
  new: "New",
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
};

export default function ReviewStep({ formData, photos, categories, onEditStep }: ReviewStepProps) {
  const category = categories.find((c) => c.id === formData.category_id);
  const dailyRate = Number(formData.daily_rate) || 0;

  // Check completeness
  const sections = [
    {
      id: 1,
      name: "Photos",
      icon: Camera,
      isComplete: photos.length > 0,
      warning: photos.length < 3 ? "Add more photos for better visibility" : null,
      content: `${photos.length} photo${photos.length !== 1 ? "s" : ""}`,
    },
    {
      id: 2,
      name: "Basics",
      icon: FileText,
      isComplete: !!formData.title && !!formData.category_id && !!formData.description,
      warning:
        formData.description.length < 100 ? "Consider adding more detail to description" : null,
      content: formData.title || "Not set",
    },
    {
      id: 3,
      name: "Pricing",
      icon: DollarSign,
      isComplete: dailyRate >= 1,
      warning: null,
      content: dailyRate > 0 ? `$${dailyRate}/day` : "Not set",
    },
    {
      id: 4,
      name: "Location",
      icon: MapPin,
      isComplete: !!formData.location,
      warning:
        formData.location && !formData.latitude ? "Coordinates not set - may affect search" : null,
      content: formData.location || "Not set",
    },
  ];

  const allComplete = sections.every((s) => s.isComplete);
  const hasWarnings = sections.some((s) => s.warning);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Review your listing</h2>
        <p className="text-muted-foreground">
          Take a final look before publishing. You can always edit your listing later.
        </p>
      </div>

      {/* Status Banner */}
      {allComplete ? (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-emerald-800 dark:text-emerald-300">
              Your listing is ready to publish!
            </p>
            {hasWarnings && (
              <p className="text-sm text-emerald-600 dark:text-emerald-500">
                Some optional improvements are suggested below.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">
              Some required fields are missing
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-500">
              Complete all sections to publish your listing.
            </p>
          </div>
        </div>
      )}

      {/* Section Review Cards */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.id}
            className={cn(
              "flex items-center justify-between p-4 rounded-lg border",
              section.isComplete ? "bg-background" : "bg-amber-50/50 dark:bg-amber-950/20"
            )}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  section.isComplete
                    ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
                )}
              >
                <section.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">{section.name}</p>
                  {section.isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{section.content}</p>
                {section.warning && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {section.warning}
                  </p>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onEditStep(section.id)}>
              <Pencil className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
        ))}
      </div>

      {/* Listing Preview */}
      <div className="space-y-4">
        <h3 className="font-medium text-foreground">Preview</h3>
        <p className="text-sm text-muted-foreground">
          This is how your listing will appear to renters.
        </p>

        <Card className="overflow-hidden max-w-sm">
          {/* Image */}
          <div className="relative aspect-video bg-muted">
            {photos.length > 0 ? (
              <img
                src={photos[0].preview}
                alt={formData.title || "Equipment preview"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            {/* Category Badge */}
            {category && (
              <div className="absolute top-3 left-3">
                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                  {category.name}
                </Badge>
              </div>
            )}
            {/* Photo Count */}
            {photos.length > 1 && (
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-black/60 text-white text-xs">
                1/{photos.length}
              </div>
            )}
          </div>

          <CardContent className="p-4 space-y-3">
            {/* Title and Location */}
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground line-clamp-1">
                {formData.title || "Your equipment title"}
              </h4>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{formData.location || "Location"}</span>
              </div>
            </div>

            {/* Description Preview */}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {formData.description || "Your equipment description will appear here..."}
            </p>

            {/* Price and Condition */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div>
                <span className="text-lg font-semibold text-foreground">
                  ${dailyRate || "0"}
                </span>
                <span className="text-sm text-muted-foreground">/day</span>
              </div>
              <Badge variant="outline" className="capitalize text-xs">
                {CONDITIONS[formData.condition] || "Good"}
              </Badge>
            </div>

            {/* Rating Placeholder */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="w-4 h-4" />
              <span>New listing</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Final Tips */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="font-medium text-foreground mb-3">What happens next:</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">1.</span>
            <span>Your listing goes live immediately after publishing</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">2.</span>
            <span>Renters can find and book your equipment</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">3.</span>
            <span>You'll receive notifications for booking requests</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">4.</span>
            <span>You can edit or pause your listing anytime</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
