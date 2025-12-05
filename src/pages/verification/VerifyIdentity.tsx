import { useVerification } from "@/hooks/useVerification";
import {
  Shield,
  CheckCircle,
  ArrowLeft,
  Phone,
  Info,
  AlertTriangle,
  Sparkles,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import DocumentUpload from "@/components/verification/DocumentUpload";
import VerificationStatusGrid from "@/components/verification/VerificationStatusGrid";
import TrustScore from "@/components/verification/TrustScore";
import PhoneVerification from "@/components/verification/PhoneVerification";
import { getVerificationProgress } from "@/lib/verification";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/useToast";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type VerificationStep = "overview" | "identity" | "phone";

type StepConfig = {
  id: VerificationStep;
  label: string;
  icon: LucideIcon;
  description: string;
  points: number;
};

const VERIFICATION_STEPS: StepConfig[] = [
  {
    id: "identity",
    label: "Identity",
    icon: Shield,
    description: "Upload a government-issued ID",
    points: 30,
  },
  {
    id: "phone",
    label: "Phone",
    icon: Phone,
    description: "Verify via SMS code",
    points: 10,
  },
];

const VerifyIdentity = () => {
  const { toast } = useToast();
  const {
    profile,
    loading,
    uploading,
    uploadVerificationDocument,
    fetchVerificationProfile,
  } = useVerification();

  const [activeStep, setActiveStep] = useState<VerificationStep>("overview");

  const hasAnyVerification = useMemo(() => {
    if (!profile) return false;
    return (
      profile.identityVerified ||
      profile.phoneVerified ||
      profile.emailVerified ||
      profile.addressVerified
    );
  }, [profile]);

  const handleUpload = async (
    file: File,
    type: "identity" | "phone" | "email" | "address"
  ) => {
    try {
      await uploadVerificationDocument(file, type);
      await fetchVerificationProfile();
      toast({
        title: "Document uploaded successfully",
        description: "Your verification document is being reviewed.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePhoneVerify = async (_phoneNumber: string, code: string) => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (code === "123456") {
          fetchVerificationProfile()
            .then(() => {
              toast({
                title: "Phone verified successfully",
                description: "Your phone number has been verified.",
              });
              resolve();
            })
            .catch((error) => {
              toast({
                title: "Verification incomplete",
                description:
                  "Phone verified but profile refresh failed. Please reload the page.",
                variant: "destructive",
              });
              reject(error);
            });
        } else {
          reject(new Error("Invalid verification code. Try 123456 for demo."));
        }
      }, 1500);
    });
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 animate-pulse">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground">Loading verification status...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const progress = profile ? getVerificationProgress(profile) : 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-8">
        {/* Back Button */}
        <Link
          to="/renter/dashboard"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-2">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Verify Your Identity
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm sm:text-base">
            Build trust and unlock more rental opportunities by completing verification
          </p>
        </div>

        {/* Urgent CTA for unverified users */}
        {progress === 0 && !hasAnyVerification && (
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/50">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    Complete your verification
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Your account is unverified. Verify now to start renting safely.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setActiveStep("identity")}
                className="w-full sm:w-auto"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Progress & Trust Score */}
          <div className="lg:col-span-1 space-y-6">
            {/* Progress Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Progress</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Info className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Why Verify?</DialogTitle>
                        <DialogDescription>
                          Verification builds trust in our community
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 text-sm">
                        <div>
                          <h4 className="font-semibold mb-2">Benefits:</h4>
                          <ul className="space-y-2 text-muted-foreground">
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Instant booking confirmation
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Access to premium equipment
                            </li>
                            <li className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Build credibility with owners
                            </li>
                          </ul>
                        </div>
                        <div className="p-3 rounded-lg bg-muted">
                          <div className="flex items-start gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <p className="text-xs text-muted-foreground">
                              Your documents are encrypted and never shared with other users.
                            </p>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Overall</span>
                    <span className="font-semibold tabular-nums">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {profile && (
                  <VerificationStatusGrid
                    profile={profile}
                    compact
                    className="gap-2"
                  />
                )}
              </CardContent>
            </Card>

            {/* Trust Score - Hidden on mobile when viewing a step */}
            {profile && (
              <div className={cn(activeStep !== "overview" && "hidden lg:block")}>
                <TrustScore score={profile.trustScore} showBreakdown={false} />
              </div>
            )}
          </div>

          {/* Right Column - Verification Steps */}
          <div className="lg:col-span-2 space-y-4">
            {activeStep === "overview" ? (
              /* Overview - Step Selection */
              <Card>
                <CardHeader>
                  <CardTitle>Choose Verification Method</CardTitle>
                  <CardDescription>
                    Select a verification to get started
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {VERIFICATION_STEPS.map((step) => {
                    const Icon = step.icon;
                    const isCompleted =
                      step.id === "identity"
                        ? profile?.identityVerified
                        : profile?.phoneVerified;

                    return (
                      <button
                        key={step.id}
                        onClick={() => setActiveStep(step.id)}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all",
                          "hover:border-primary/50 hover:bg-accent/30",
                          isCompleted
                            ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20"
                            : "border-border"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              "p-3 rounded-xl",
                              isCompleted
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-primary/10"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-5 w-5",
                                isCompleted
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-primary"
                              )}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-foreground">
                                {step.label} Verification
                              </h3>
                              {isCompleted && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {step.description}
                            </p>
                            {!isCompleted && (
                              <p className="text-xs text-primary font-medium mt-2">
                                +{step.points} trust points
                              </p>
                            )}
                          </div>
                          <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                        </div>
                      </button>
                    );
                  })}

                  <Alert className="mt-4">
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      <strong>Pro tip:</strong> Complete all verifications for instant
                      booking confirmation and access to premium equipment.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            ) : activeStep === "identity" ? (
              /* Identity Verification */
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Identity Verification</CardTitle>
                      <CardDescription>
                        Upload a clear photo of your government ID
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveStep("overview")}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {profile?.identityVerified ? (
                    <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        <strong>Identity Verified!</strong> Your identity has been
                        successfully verified.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      <DocumentUpload
                        type="identity"
                        onUpload={handleUpload}
                        isUploading={uploading}
                      />

                      <div className="space-y-3 p-4 rounded-xl bg-muted/50">
                        <h4 className="text-sm font-semibold">Accepted Documents:</h4>
                        <ul className="text-sm text-muted-foreground space-y-2">
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                            Driver's License (front and back)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                            Passport (photo page)
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                            State-issued ID card
                          </li>
                        </ul>
                      </div>

                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <div className="flex items-start gap-2">
                          <Lock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground">
                            <strong className="text-foreground">Your privacy matters:</strong>{" "}
                            Documents are encrypted and only used for verification.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Phone Verification */
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Phone Verification</CardTitle>
                      <CardDescription>
                        Verify your phone number via SMS
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveStep("overview")}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {profile?.phoneVerified ? (
                    <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-700 dark:text-green-300">
                        <strong>Phone Verified!</strong> Your phone number has been
                        successfully verified.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <PhoneVerification
                      onVerify={handlePhoneVerify}
                      isVerifying={uploading}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Trust Score Breakdown - Shown below on mobile */}
            {profile && activeStep === "overview" && (
              <div className="lg:hidden">
                <TrustScore score={profile.trustScore} />
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default VerifyIdentity;
