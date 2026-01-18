import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, AlertCircle, Cloud, CheckCircle2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import WizardProgress from "./WizardProgress";
import WizardNavigation from "./WizardNavigation";
import PhotosStep from "./steps/PhotosStep";
import BasicsStep from "./steps/BasicsStep";
import PricingStep from "./steps/PricingStep";
import LocationStep from "./steps/LocationStep";
import ReviewStep from "./steps/ReviewStep";
import { useListingWizard, type WizardPhoto } from "./hooks/useListingWizard";
import { fireSuccessConfetti } from "@/lib/celebrations";

class PhotoSyncError extends Error {
  name = "PhotoSyncError";
}

interface ListingWizardProps {
  equipment?: Database["public"]["Tables"]["equipment"]["Row"];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ListingWizard({
  equipment,
  onSuccess,
  onCancel,
}: ListingWizardProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<
    Database["public"]["Tables"]["categories"]["Row"][]
  >([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<
    { id: string; url: string }[]
  >([]);
  const [existingPhotosError, setExistingPhotosError] = useState<string | null>(
    null
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [prevStep, setPrevStep] = useState(1);
  const [isAnimating, setIsAnimating] = useState(false);

  const wizard = useListingWizard({
    equipment,
    existingPhotos,
    onComplete: () => {
      setShowSuccess(true);
      // Auto-close after animation
      setTimeout(() => {
        onSuccess?.();
      }, 2500);
    },
  });

  // Handle cancel with unsaved changes warning
  const handleCancelClick = useCallback(() => {
    if (wizard.isDirty && !wizard.isEditMode) {
      setShowExitDialog(true);
    } else {
      onCancel?.();
    }
  }, [wizard.isDirty, wizard.isEditMode, onCancel]);

  const handleExitKeepingDraft = useCallback(() => {
    setShowExitDialog(false);
    onCancel?.();
  }, [onCancel]);

  const handleConfirmExit = useCallback(() => {
    wizard.clearDraft();
    setShowExitDialog(false);
    onCancel?.();
  }, [wizard, onCancel]);

  // Format last saved time
  const formatLastSaved = useCallback((timestamp: number | null) => {
    if (!timestamp) return null;
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return "Saved";
    if (seconds < 60) return `Saved ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `Saved ${minutes}m ago`;
  }, []);

  // Track step changes for animations
  useEffect(() => {
    if (wizard.currentStep !== prevStep) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setPrevStep(wizard.currentStep);
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [wizard.currentStep, prevStep]);

  useEffect(() => {
    if (showSuccess) {
      fireSuccessConfetti();
    }
  }, [showSuccess]);

  const slideDirection = wizard.currentStep > prevStep ? "left" : "right";

  // Fetch categories
  useEffect(() => {
    let cancelled = false;
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("name");
        if (error) {
          console.error("Error fetching categories:", error);
          if (!cancelled) setCategoriesError("Failed to load categories.");
          return;
        }
        if (!cancelled) {
          setCategoriesError(null);
          setCategories(data ?? []);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        if (!cancelled) setCategoriesError("Failed to load categories.");
      }
    };
    void fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch existing photos for edit mode
  useEffect(() => {
    let cancelled = false;
    const fetchExistingPhotos = async () => {
      if (!equipment) return;

      try {
        const { data, error } = await supabase
          .from("equipment_photos")
          .select("id, photo_url")
          .eq("equipment_id", equipment.id)
          .order("order_index");

        if (error) {
          console.error("Error fetching existing photos:", error);
          if (!cancelled)
            setExistingPhotosError("Failed to load existing photos.");
          return;
        }

        if (!cancelled) {
          setExistingPhotosError(null);
          setExistingPhotos(
            (data ?? []).map((p) => ({ id: p.id, url: p.photo_url }))
          );
        }
      } catch (error) {
        console.error("Error fetching existing photos:", error);
        if (!cancelled)
          setExistingPhotosError("Failed to load existing photos.");
      }
    };
    void fetchExistingPhotos();
    return () => {
      cancelled = true;
    };
  }, [equipment]);

  const syncPhotos = async (equipmentId: string, photos: WizardPhoto[]) => {
    if (!user) return;

    const keptExistingIds = new Set(
      photos.filter((p) => p.isExisting).map((p) => p.id)
    );
    const removedExistingIds = existingPhotos
      .map((p) => p.id)
      .filter((id) => !keptExistingIds.has(id));

    const insertedPhotoIds: string[] = [];
    const uploadedPaths: string[] = [];
    const insertedIdByTempId = new Map<string, string>();

    const rollbackInserted = async () => {
      if (insertedPhotoIds.length > 0) {
        const { error } = await supabase
          .from("equipment_photos")
          .delete()
          .in("id", insertedPhotoIds);
        if (error) {
          console.error("Failed to rollback inserted photo rows:", error);
        }
      }
      if (uploadedPaths.length > 0) {
        const { error } = await supabase.storage
          .from("equipment-photos")
          .remove(uploadedPaths);
        if (error) {
          console.error("Failed to rollback uploaded photo files:", error);
        }
      }
    };

    const extensionFromMimeType = (mimeType: string) => {
      switch (mimeType) {
        case "image/png":
          return "png";
        case "image/webp":
          return "webp";
        case "image/jpeg":
        default:
          return "jpg";
      }
    };

    const newPhotosWithIndex = photos
      .map((photo, index) => ({ photo, index }))
      .filter(({ photo }) => !photo.isExisting);

    for (const { photo, index } of newPhotosWithIndex) {
      if (!photo.file) {
        await rollbackInserted();
        throw new PhotoSyncError(
          "One or more new photos are missing file data. Please re-add them."
        );
      }

      const rawExt = photo.file.name.split(".").pop()?.toLowerCase();
      const fileExt = rawExt || extensionFromMimeType(photo.file.type);
      const fileName = `${
        user.id
      }/${equipmentId}/${Date.now()}_${index}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("equipment-photos")
        .upload(fileName, photo.file);

      if (uploadError) {
        console.error("Error uploading photo:", uploadError);
        await rollbackInserted();
        throw new PhotoSyncError(
          "Failed to upload one or more photos. Please try again."
        );
      }

      uploadedPaths.push(fileName);

      const {
        data: { publicUrl },
      } = supabase.storage.from("equipment-photos").getPublicUrl(fileName);

      const { data: inserted, error: insertError } = await supabase
        .from("equipment_photos")
        .insert({
          equipment_id: equipmentId,
          photo_url: publicUrl,
          is_primary: false,
          order_index: 1000 + index,
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("Error inserting uploaded photo record:", insertError);
        await rollbackInserted();
        throw new PhotoSyncError(
          "Failed to save one or more photos. Please try again."
        );
      }

      insertedPhotoIds.push(inserted.id);
      insertedIdByTempId.set(photo.id, inserted.id);
    }

    const orderedPhotoIds: string[] = [];
    for (const photo of photos) {
      if (photo.isExisting) {
        orderedPhotoIds.push(photo.id);
        continue;
      }
      const insertedId = insertedIdByTempId.get(photo.id);
      if (!insertedId) {
        throw new PhotoSyncError(
          "Failed to resolve uploaded photo IDs. Please try again."
        );
      }
      orderedPhotoIds.push(insertedId);
    }

    for (let i = 0; i < orderedPhotoIds.length; i++) {
      const photoId = orderedPhotoIds[i];
      const { error } = await supabase
        .from("equipment_photos")
        .update({
          order_index: i,
          is_primary: i === 0,
        })
        .eq("id", photoId);

      if (error) {
        console.error("Error updating photo order:", error);
        throw new PhotoSyncError(
          "Failed to update photo order. Please try again."
        );
      }
    }

    if (removedExistingIds.length > 0) {
      const { error } = await supabase
        .from("equipment_photos")
        .delete()
        .in("id", removedExistingIds);
      if (error) {
        console.error("Error deleting removed photos:", error);
        throw new PhotoSyncError(
          "Failed to remove deleted photos. Please try again."
        );
      }
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Final validation
    const errors = wizard.validateStep(5);
    if (errors.length > 0) {
      setSubmitError(errors[0]);
      return;
    }

    wizard.setSubmitting(true);
    setSubmitError(null);

    try {
      const { formData, photos } = wizard;

      const equipmentData = {
        owner_id: user.id,
        title: formData.title,
        description: formData.description,
        category_id: formData.category_id,
        daily_rate: Number(formData.daily_rate),
        condition: formData.condition,
        location: formData.location,
        latitude: formData.latitude ? Number(formData.latitude) : null,
        longitude: formData.longitude ? Number(formData.longitude) : null,
        damage_deposit_amount:
          formData.damage_deposit_type === "fixed"
            ? Number(formData.damage_deposit_amount)
            : null,
        damage_deposit_percentage:
          formData.damage_deposit_type === "percentage"
            ? Number(formData.damage_deposit_percentage)
            : null,
        deposit_refund_timeline_hours:
          formData.damage_deposit_type !== "none"
            ? formData.deposit_refund_timeline_hours
            : 48,
      };

      let equipmentId: string;

      if (equipment) {
        // Update existing
        const { error } = await supabase
          .from("equipment")
          .update(equipmentData)
          .eq("id", equipment.id);

        if (error) throw error;
        equipmentId = equipment.id;
      } else {
        // Create new
        const { data: newEquipment, error } = await supabase
          .from("equipment")
          .insert({ ...equipmentData, is_available: true })
          .select()
          .single();

        if (error) throw error;
        if (!newEquipment) throw new Error("Failed to create equipment");
        equipmentId = newEquipment.id;
      }

      // Upload/update photos
      await syncPhotos(equipmentId, photos);

      wizard.handleComplete();
    } catch (error) {
      console.error("Error saving equipment:", error);
      if (error instanceof PhotoSyncError) {
        setSubmitError(error.message);
      } else {
        setSubmitError("Failed to save equipment. Please try again.");
      }
    } finally {
      wizard.setSubmitting(false);
    }
  };

  const currentErrors = wizard.stepErrors[wizard.currentStep] || [];
  const savedText = formatLastSaved(wizard.lastSavedAt);
  const fetchErrors = [
    ...(categoriesError &&
    (wizard.currentStep === 2 || wizard.currentStep === 5)
      ? [categoriesError]
      : []),
    ...(existingPhotosError && wizard.isEditMode && wizard.currentStep === 1
      ? [existingPhotosError]
      : []),
  ];
  const alertMessages = [
    ...(submitError ? [submitError] : []),
    ...currentErrors,
    ...fetchErrors,
  ];

  // Success overlay
  if (showSuccess) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="w-24 h-24 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center animate-bounce-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            {/* Staggered sparkles around the icon */}
            <Sparkles
              className="absolute -top-2 -right-2 w-6 h-6 text-amber-500 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <Sparkles
              className="absolute -top-2 -left-2 w-5 h-5 text-emerald-500 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <Sparkles
              className="absolute -bottom-2 right-4 w-4 h-4 text-blue-500 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {wizard.isEditMode ? "Listing Updated!" : "Listing Published!"}
            </h2>
            <p className="text-muted-foreground">
              {wizard.isEditMode
                ? "Your changes have been saved successfully."
                : "Your equipment is now live and ready for renters to discover."}
            </p>
          </div>
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">
                {wizard.isEditMode ? "Edit Listing" : "Create New Listing"}
              </h1>
              {/* Auto-save indicator */}
              {savedText && !wizard.isEditMode && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>{savedText}</span>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancelClick}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <WizardProgress
            currentStep={wizard.currentStep}
            onStepClick={wizard.isEditMode ? wizard.goToStep : undefined}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Error Alert */}
          {alertMessages.length > 0 && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {alertMessages.map((message, index) => (
                    <div key={index}>{message}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Step Content */}
          <div className="min-h-[400px] overflow-hidden">
            <div
              key={wizard.currentStep}
              className={cn(
                "transition-all duration-300 ease-out",
                isAnimating
                  ? slideDirection === "left"
                    ? "animate-in slide-in-from-right fade-in"
                    : "animate-in slide-in-from-left fade-in"
                  : ""
              )}
            >
              {wizard.currentStep === 1 && (
                <PhotosStep
                  photos={wizard.photos}
                  onPhotosChange={wizard.setPhotos}
                  onAddPhotos={wizard.addPhotos}
                  onRemovePhoto={wizard.removePhoto}
                />
              )}
              {wizard.currentStep === 2 && (
                <BasicsStep
                  formData={wizard.formData}
                  categories={categories}
                  onUpdate={wizard.updateFormData}
                />
              )}
              {wizard.currentStep === 3 && (
                <PricingStep
                  formData={wizard.formData}
                  onUpdate={wizard.updateFormData}
                />
              )}
              {wizard.currentStep === 4 && (
                <LocationStep
                  formData={wizard.formData}
                  onUpdate={wizard.updateFormData}
                />
              )}
              {wizard.currentStep === 5 && (
                <ReviewStep
                  formData={wizard.formData}
                  photos={wizard.photos}
                  categories={categories}
                  onEditStep={wizard.goToStep}
                />
              )}
            </div>
          </div>

          {/* Navigation */}
          <WizardNavigation
            currentStep={wizard.currentStep}
            isSubmitting={wizard.isSubmitting}
            isEditMode={wizard.isEditMode}
            onBack={wizard.prevStep}
            onNext={wizard.nextStep}
            onSubmit={() => void handleSubmit()}
            onCancel={handleCancelClick}
          />
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Your draft has been saved and you can
              continue later, or discard all changes now.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowExitDialog(false)}>
              Keep editing
            </Button>
            <Button variant="ghost" onClick={handleExitKeepingDraft}>
              Exit (draft saved)
            </Button>
            <Button variant="destructive" onClick={handleConfirmExit}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
