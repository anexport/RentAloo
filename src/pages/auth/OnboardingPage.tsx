import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Mountain,
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  User,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StepProgress } from "@/components/ui/step-progress";
import { CheckboxGroup } from "@/components/ui/checkbox-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// Timeout for Edge Function call (30 seconds)
const ONBOARDING_TIMEOUT_MS = 30000;

// Onboarding form schema - all fields required at final submission
// Step validation uses trigger() to validate specific fields per step
const onboardingSchema = z.object({
  role: z.enum(["renter", "owner"]),
  location: z.string().min(2, "Please enter your location"),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]),
  interests: z.array(z.string()).min(1, "Please select at least one interest"),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const STEPS = [
  { id: 1, title: "Role", description: "How will you use Vaymo?" },
  { id: 2, title: "Details", description: "Location & experience" },
  { id: 3, title: "Interests", description: "Your activities" },
];

const INTEREST_OPTIONS = [
  { value: "hiking", label: "Hiking", description: "Trails and backpacking" },
  {
    value: "climbing",
    label: "Climbing",
    description: "Rock and ice climbing",
  },
  { value: "skiing", label: "Skiing", description: "Alpine and backcountry" },
  {
    value: "snowboarding",
    label: "Snowboarding",
    description: "Resort and powder",
  },
  { value: "cycling", label: "Cycling", description: "Road and gravel" },
  { value: "camping", label: "Camping", description: "Car and backcountry" },
  { value: "kayaking", label: "Kayaking", description: "Rivers and lakes" },
  {
    value: "paddleboarding",
    label: "Paddleboarding",
    description: "SUP adventures",
  },
  { value: "surfing", label: "Surfing", description: "Ocean waves" },
  {
    value: "mountain_biking",
    label: "Mountain Biking",
    description: "Trails and jumps",
  },
  { value: "running", label: "Running", description: "Trail running" },
];

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner", description: "Just starting out" },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "Some experience",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "Experienced enthusiast",
  },
];

const OnboardingPage = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    mode: "onBlur",
    defaultValues: {
      role: undefined as unknown as "renter" | "owner",
      interests: [],
      experienceLevel: undefined as unknown as
        | "beginner"
        | "intermediate"
        | "advanced",
    },
  });

  const selectedRole = watch("role");
  const selectedInterests = watch("interests");
  const experienceLevel = watch("experienceLevel");

  const handleNextStep = async () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = await trigger(["role"]);
      if (isValid) {
        toast({
          title: t(
            "onboarding.step_complete_toast.step1_title",
            "Step 1 Complete!"
          ),
          description: t(
            "onboarding.step_complete_toast.step1_description",
            "Your role has been saved"
          ),
        });
      }
    } else if (currentStep === 2) {
      isValid = await trigger(["location", "experienceLevel"]);
      if (isValid) {
        toast({
          title: t(
            "onboarding.step_complete_toast.step2_title",
            "Step 2 Complete!"
          ),
          description: t(
            "onboarding.step_complete_toast.step2_description",
            "Your details have been saved"
          ),
        });
      }
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      setError(null);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setError(null);
  };

  const onSubmit = async (data: OnboardingFormData) => {
    if (!user) {
      setError("Please sign in to continue");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get the current session for the auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("No active session. Please sign in again.");
      }

      // Call the atomic Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-onboarding`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            role: data.role,
            location: data.location,
            experienceLevel: data.experienceLevel,
            interests: data.interests,
          }),
          signal: AbortSignal.timeout(ONBOARDING_TIMEOUT_MS),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to complete onboarding");
      }

      if (!result.success) {
        throw new Error(result.error || "Onboarding failed");
      }

      // Refresh the session to get updated user_metadata
      await supabase.auth.refreshSession();

      // Show success toast
      toast({
        title: "Profile Complete!",
        description:
          "Welcome to Vaymo. Your profile has been set up successfully.",
      });

      // Navigate to appropriate dashboard
      if (data.role === "owner") {
        void navigate("/owner/dashboard");
      } else {
        void navigate("/renter/dashboard");
      }
    } catch (err) {
      console.error("Onboarding error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to complete onboarding. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="border-none shadow-2xl">
          <CardHeader className="text-center space-y-2 pb-4">
            <div className="flex justify-center mb-2">
              <Mountain className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-display-sm font-bold">
              {t("onboarding.title", "Complete Your Profile")}
            </CardTitle>
            <CardDescription className="text-base">
              {t(
                "onboarding.subtitle",
                "Just a few more details to get you started"
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 sm:px-10 pb-8">
            <StepProgress steps={STEPS} currentStep={currentStep} />

            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form
              onSubmit={(e) => {
                void handleSubmit(onSubmit)(e);
              }}
              className="space-y-6"
            >
              {/* Step 1: Role Selection */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="text-center mb-6">
                    <h3 className="text-title-lg font-semibold mb-1">
                      {t("onboarding.role_title", "How will you use Vaymo?")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t(
                        "onboarding.role_subtitle",
                        "You can always change this later"
                      )}
                    </p>
                  </div>

                  <RadioGroup
                    value={selectedRole}
                    onValueChange={(value) =>
                      setValue("role", value as "renter" | "owner")
                    }
                  >
                    <div className="grid gap-4">
                      {/* Renter Option */}
                      <div
                        className={cn(
                          "flex items-start space-x-4 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-accent",
                          selectedRole === "renter" &&
                            "border-primary bg-accent"
                        )}
                        onClick={() => setValue("role", "renter")}
                      >
                        <RadioGroupItem
                          value="renter"
                          id="renter"
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <User className="h-5 w-5 text-primary" />
                            <Label
                              htmlFor="renter"
                              className="text-base font-medium cursor-pointer"
                            >
                              {t("signup.renter_option_title")}
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("signup.renter_option_description")}
                          </p>
                        </div>
                      </div>

                      {/* Owner Option */}
                      <div
                        className={cn(
                          "flex items-start space-x-4 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-accent",
                          selectedRole === "owner" && "border-primary bg-accent"
                        )}
                        onClick={() => setValue("role", "owner")}
                      >
                        <RadioGroupItem
                          value="owner"
                          id="owner"
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            <Label
                              htmlFor="owner"
                              className="text-base font-medium cursor-pointer"
                            >
                              {t("signup.owner_option_title")}
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t("signup.owner_option_description")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>

                  {errors.role && (
                    <p className="text-sm text-destructive">
                      {t(
                        "onboarding.role_required",
                        "Please select how you'll use Vaymo"
                      )}
                    </p>
                  )}
                </div>
              )}

              {/* Step 2: Location & Experience */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="text-center mb-6">
                    <h3 className="text-title-lg font-semibold mb-1">
                      {t("signup.renter.step2.personalization_title")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("signup.renter.step2.personalization_subtitle")}
                    </p>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="location"
                      className="flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {t("signup.renter.step2.location_label")}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="location"
                      {...register("location")}
                      placeholder={t(
                        "signup.renter.step2.location_placeholder"
                      )}
                      className={errors.location ? "border-destructive" : ""}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("signup.renter.step2.location_helper")}
                    </p>
                    {errors.location && (
                      <p className="text-sm text-destructive">
                        {errors.location.message}
                      </p>
                    )}
                  </div>

                  {/* Experience Level */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">
                      {t("signup.renter.step2.experience_level_label")}
                      <span className="text-destructive">*</span>
                    </Label>
                    <RadioGroup
                      value={experienceLevel}
                      onValueChange={(value) =>
                        setValue(
                          "experienceLevel",
                          value as "beginner" | "intermediate" | "advanced"
                        )
                      }
                    >
                      <div className="space-y-3">
                        {EXPERIENCE_LEVELS.map((level) => (
                          <div
                            key={level.value}
                            className={cn(
                              "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors hover:bg-accent",
                              experienceLevel === level.value &&
                                "border-primary bg-accent"
                            )}
                            onClick={() =>
                              setValue(
                                "experienceLevel",
                                level.value as
                                  | "beginner"
                                  | "intermediate"
                                  | "advanced"
                              )
                            }
                          >
                            <RadioGroupItem
                              value={level.value}
                              id={level.value}
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={level.value}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {t(
                                  `signup.renter.experience_levels.${level.value}`,
                                  level.label
                                )}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {t(
                                  `signup.renter.experience_levels.${level.value}_description`,
                                  level.description
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                    {errors.experienceLevel && (
                      <p className="text-sm text-destructive">
                        {errors.experienceLevel.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Interests */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="text-center mb-6">
                    <h3 className="text-title-lg font-semibold mb-1">
                      {t("signup.renter.step3.interests_title")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("signup.renter.step3.interests_subtitle")}
                    </p>
                  </div>

                  <CheckboxGroup
                    options={INTEREST_OPTIONS}
                    value={selectedInterests || []}
                    onChange={(value) => setValue("interests", value)}
                    error={errors.interests?.message}
                    columns={2}
                  />
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-3 pt-6">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrevStep}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    {t("signup.common.back_button")}
                  </Button>
                )}

                {currentStep < STEPS.length ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    className="flex-1"
                  >
                    {t("signup.common.continue_button")}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? (
                      <span>{t("onboarding.completing", "Completing...")}</span>
                    ) : (
                      <>
                        {t("onboarding.complete", "Complete Setup")}
                        <Check className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnboardingPage;
