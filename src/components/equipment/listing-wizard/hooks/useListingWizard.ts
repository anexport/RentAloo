import { useState, useCallback, useEffect, useMemo } from "react";
import type { Database } from "@/lib/database.types";

export type EquipmentCondition = Database["public"]["Enums"]["equipment_condition"];

export interface WizardPhoto {
  id: string;
  file?: File;
  preview: string;
  isExisting: boolean;
}

export interface WizardFormData {
  // Basics
  title: string;
  description: string;
  category_id: string;
  condition: EquipmentCondition;
  // Pricing
  daily_rate: number | "";
  damage_deposit_type: "none" | "fixed" | "percentage";
  damage_deposit_amount: number | "";
  damage_deposit_percentage: number | "";
  deposit_refund_timeline_hours: number;
  // Location
  location: string;
  latitude: number | "";
  longitude: number | "";
}

export interface WizardState {
  currentStep: number;
  formData: WizardFormData;
  photos: WizardPhoto[];
  isSubmitting: boolean;
  stepErrors: Record<number, string[]>;
  lastSavedAt: number | null;
}

const STORAGE_KEY = "rentaloo_listing_draft";

const defaultFormData: WizardFormData = {
  title: "",
  description: "",
  category_id: "",
  condition: "good",
  daily_rate: "",
  damage_deposit_type: "none",
  damage_deposit_amount: "",
  damage_deposit_percentage: "",
  deposit_refund_timeline_hours: 48,
  location: "",
  latitude: "",
  longitude: "",
};

export const WIZARD_STEPS = [
  { id: 1, name: "Photos", shortName: "Photos" },
  { id: 2, name: "Basics", shortName: "Basics" },
  { id: 3, name: "Pricing", shortName: "Pricing" },
  { id: 4, name: "Location", shortName: "Location" },
  { id: 5, name: "Review", shortName: "Review" },
] as const;

export const TOTAL_STEPS = WIZARD_STEPS.length;

interface UseListingWizardProps {
  equipment?: Database["public"]["Tables"]["equipment"]["Row"];
  existingPhotos?: { id: string; url: string }[];
  onComplete?: () => void;
}

export function useListingWizard({
  equipment,
  existingPhotos = [],
  onComplete,
}: UseListingWizardProps = {}) {
  const isEditMode = !!equipment;

  const [state, setState] = useState<WizardState>(() => {
    // Try to restore draft for new listings
    if (!isEditMode) {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as Partial<WizardState>;
          return {
            currentStep: parsed.currentStep || 1,
            formData: { ...defaultFormData, ...parsed.formData },
            photos: [], // Photos can't be restored from storage
            isSubmitting: false,
            stepErrors: {},
            lastSavedAt: Date.now(),
          };
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Initialize from equipment for edit mode
    if (equipment) {
      return {
        currentStep: 1,
        formData: {
          title: equipment.title,
          description: equipment.description,
          category_id: equipment.category_id,
          condition: equipment.condition,
          daily_rate: equipment.daily_rate,
          damage_deposit_type:
            equipment.damage_deposit_amount && equipment.damage_deposit_amount > 0
              ? "fixed"
              : equipment.damage_deposit_percentage && equipment.damage_deposit_percentage > 0
              ? "percentage"
              : "none",
          damage_deposit_amount: equipment.damage_deposit_amount || "",
          damage_deposit_percentage: equipment.damage_deposit_percentage || "",
          deposit_refund_timeline_hours: equipment.deposit_refund_timeline_hours || 48,
          location: equipment.location,
          latitude: equipment.latitude || "",
          longitude: equipment.longitude || "",
        },
        photos: existingPhotos.map((p) => ({
          id: p.id,
          preview: p.url,
          isExisting: true,
        })),
        isSubmitting: false,
        stepErrors: {},
        lastSavedAt: null,
      };
    }

    return {
      currentStep: 1,
      formData: defaultFormData,
      photos: [],
      isSubmitting: false,
      stepErrors: {},
      lastSavedAt: null,
    };
  });

  // Load existing photos when they change (for edit mode)
  useEffect(() => {
    if (existingPhotos.length > 0 && state.photos.length === 0) {
      setState((prev) => ({
        ...prev,
        photos: existingPhotos.map((p) => ({
          id: p.id,
          preview: p.url,
          isExisting: true,
        })),
      }));
    }
  }, [existingPhotos, state.photos.length]);

  // Save draft to sessionStorage (new listings only)
  useEffect(() => {
    if (!isEditMode) {
      const toSave = {
        currentStep: state.currentStep,
        formData: state.formData,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setState((prev) => ({ ...prev, lastSavedAt: Date.now() }));
    }
  }, [state.currentStep, state.formData, isEditMode]);

  // Calculate if form has unsaved changes (any data entered)
  const isDirty = useMemo(() => {
    const { formData, photos } = state;
    // Check if any field differs from default
    const hasFormChanges =
      formData.title !== defaultFormData.title ||
      formData.description !== defaultFormData.description ||
      formData.category_id !== defaultFormData.category_id ||
      formData.daily_rate !== defaultFormData.daily_rate ||
      formData.location !== defaultFormData.location;
    const hasPhotos = photos.length > 0;
    return hasFormChanges || hasPhotos;
  }, [state]);

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const updateFormData = useCallback(
    <K extends keyof WizardFormData>(field: K, value: WizardFormData[K]) => {
      setState((prev) => ({
        ...prev,
        formData: { ...prev.formData, [field]: value },
        stepErrors: {}, // Clear errors on change
      }));
    },
    []
  );

  const setPhotos = useCallback((photos: WizardPhoto[]) => {
    setState((prev) => ({
      ...prev,
      photos,
      stepErrors: {},
    }));
  }, []);

  const addPhotos = useCallback((newPhotos: WizardPhoto[]) => {
    setState((prev) => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos].slice(0, 5), // Max 5
      stepErrors: {},
    }));
  }, []);

  const removePhoto = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      photos: prev.photos.filter((p) => p.id !== id),
    }));
  }, []);

  const reorderPhotos = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const newPhotos = [...prev.photos];
      const [removed] = newPhotos.splice(fromIndex, 1);
      newPhotos.splice(toIndex, 0, removed);
      return { ...prev, photos: newPhotos };
    });
  }, []);

  // Step validation
  const validateStep = useCallback(
    (step: number): string[] => {
      const errors: string[] = [];
      const { formData, photos } = state;

      switch (step) {
        case 1: // Photos
          if (photos.length === 0) {
            errors.push("Please add at least one photo");
          }
          break;

        case 2: // Basics
          if (!formData.title.trim()) {
            errors.push("Title is required");
          }
          if (!formData.category_id) {
            errors.push("Please select a category");
          }
          if (!formData.condition) {
            errors.push("Please select a condition");
          }
          if (!formData.description.trim() || formData.description.length < 10) {
            errors.push("Description must be at least 10 characters");
          }
          break;

        case 3: // Pricing
          if (!formData.daily_rate || Number(formData.daily_rate) < 1) {
            errors.push("Daily rate must be at least $1");
          }
          if (
            formData.damage_deposit_type === "fixed" &&
            (!formData.damage_deposit_amount || Number(formData.damage_deposit_amount) < 0)
          ) {
            errors.push("Please enter a valid deposit amount");
          }
          if (
            formData.damage_deposit_type === "percentage" &&
            (!formData.damage_deposit_percentage ||
              Number(formData.damage_deposit_percentage) < 0 ||
              Number(formData.damage_deposit_percentage) > 100)
          ) {
            errors.push("Deposit percentage must be between 0 and 100");
          }
          break;

        case 4: // Location
          if (!formData.location.trim()) {
            errors.push("Location is required");
          }
          break;

        case 5: // Review - validate all
          errors.push(...validateStep(1));
          errors.push(...validateStep(2));
          errors.push(...validateStep(3));
          errors.push(...validateStep(4));
          break;
      }

      return errors;
    },
    [state]
  );

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= TOTAL_STEPS) {
      setState((prev) => ({ ...prev, currentStep: step, stepErrors: {} }));
    }
  }, []);

  const nextStep = useCallback(() => {
    const errors = validateStep(state.currentStep);
    if (errors.length > 0) {
      setState((prev) => ({
        ...prev,
        stepErrors: { [state.currentStep]: errors },
      }));
      return false;
    }

    if (state.currentStep < TOTAL_STEPS) {
      setState((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
        stepErrors: {},
      }));
      return true;
    }
    return false;
  }, [state.currentStep, validateStep]);

  const prevStep = useCallback(() => {
    if (state.currentStep > 1) {
      setState((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
        stepErrors: {},
      }));
    }
  }, [state.currentStep]);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setState((prev) => ({ ...prev, isSubmitting }));
  }, []);

  const handleComplete = useCallback(() => {
    clearDraft();
    onComplete?.();
  }, [clearDraft, onComplete]);

  return {
    // State
    currentStep: state.currentStep,
    formData: state.formData,
    photos: state.photos,
    isSubmitting: state.isSubmitting,
    stepErrors: state.stepErrors,
    isEditMode,
    isDirty,
    lastSavedAt: state.lastSavedAt,

    // Actions
    updateFormData,
    setPhotos,
    addPhotos,
    removePhoto,
    reorderPhotos,
    goToStep,
    nextStep,
    prevStep,
    validateStep,
    setSubmitting,
    clearDraft,
    handleComplete,
  };
}
