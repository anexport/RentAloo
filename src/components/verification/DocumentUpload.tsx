import { useState, useCallback } from "react";
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Camera,
  Image as ImageIcon,
  Clock,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { validateDocument } from "@/lib/verification";
import type {
  VerificationType,
  VerificationStatus,
} from "@/types/verification";
import { cn } from "@/lib/utils";

type PendingDocument = {
  url: string;
  submittedAt: string;
  status: VerificationStatus;
  rejectionReason?: string;
};

type DocumentUploadProps = {
  type: VerificationType;
  onUpload: (file: File, type: VerificationType) => Promise<void>;
  isUploading?: boolean;
  className?: string;
  /** If provided, shows the pending/rejected state instead of upload zone */
  pendingDocument?: PendingDocument;
};

const TYPE_CONFIG: Record<
  VerificationType,
  { label: string; description: string; icon: typeof FileText }
> = {
  identity: {
    label: "Government ID",
    description: "Driver's License, Passport, or State ID",
    icon: FileText,
  },
  address: {
    label: "Proof of Address",
    description: "Utility bill or bank statement (last 3 months)",
    icon: FileText,
  },
  phone: {
    label: "Phone Verification",
    description: "Phone verification document",
    icon: FileText,
  },
  email: {
    label: "Email Verification",
    description: "Email verification document",
    icon: FileText,
  },
};

const DocumentUpload = ({
  type,
  onUpload,
  isUploading = false,
  className,
  pendingDocument,
}: DocumentUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const config = TYPE_CONFIG[type];

  // Validate document URL is from trusted source (Supabase storage or data URL)
  const isSafeDocumentUrl = (url: string): boolean => {
    if (!url) return false;
    try {
      // Allow data URLs for local previews
      if (url.startsWith("data:")) return true;

      const parsed = new URL(url);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as
        | string
        | undefined;

      // Check if URL is from our Supabase storage
      if (supabaseUrl) {
        const supabaseHost = new URL(supabaseUrl).host;
        if (
          parsed.host === supabaseHost ||
          parsed.host.endsWith(".supabase.co")
        ) {
          return true;
        }
      }

      // Fallback: allow any supabase.co domain
      return parsed.host.endsWith(".supabase.co");
    } catch {
      return false;
    }
  };

  // Format date for display with validation
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "";
      }
      // Use user's locale (undefined = browser default)
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const handleFileSelect = useCallback((file: File) => {
    setError(null);

    const validation = validateDocument(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await onUpload(selectedFile, type);
      setSelectedFile(null);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">
          {config.label}
        </h3>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </div>

      {/* Pending Document State - Document under review */}
      {pendingDocument && pendingDocument.status === "pending" && (
        <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {/* Document Preview */}
              <div className="flex-shrink-0">
                {pendingDocument.url &&
                pendingDocument.url.match(/\.(jpg|jpeg|png|webp)$/i) &&
                isSafeDocumentUrl(pendingDocument.url) ? (
                  <img
                    src={pendingDocument.url}
                    alt="Uploaded document"
                    className="w-20 h-20 object-cover rounded-lg border border-green-200 dark:border-green-800"
                  />
                ) : (
                  <div className="w-20 h-20 flex items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                    <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                )}
              </div>

              {/* Status Info */}
              <div className="flex-1 min-w-0">
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 border-green-200 dark:border-green-700 mb-2">
                  <Clock className="h-3 w-3 mr-1" />
                  Under Review
                </Badge>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Your document has been submitted
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  Submitted {formatDate(pendingDocument.submittedAt)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  We'll notify you once your verification is complete.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected Document State - Can re-upload */}
      {pendingDocument && pendingDocument.status === "rejected" && (
        <>
          <Alert variant="destructive" className="py-3">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Verification Rejected</strong>
              {pendingDocument.rejectionReason && (
                <span className="block mt-1 text-muted-foreground">
                  Reason: {pendingDocument.rejectionReason}
                </span>
              )}
              <span className="block mt-1">Please upload a new document.</span>
            </AlertDescription>
          </Alert>
        </>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Upload Zone - Show only when not pending and no file selected */}
      {(!pendingDocument ||
        pendingDocument.status === "rejected" ||
        pendingDocument.status === "unverified") &&
        !selectedFile && (
          <div
            className={cn(
              "relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all duration-200",
              isDragging
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border bg-card hover:border-primary/50 hover:bg-accent/30"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {/* Icon */}
            <div
              className={cn(
                "inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mb-4 transition-all duration-200",
                isDragging ? "bg-primary/20 scale-110" : "bg-primary/10"
              )}
            >
              <Upload
                className={cn(
                  "h-6 w-6 sm:h-7 sm:w-7 transition-colors",
                  isDragging ? "text-primary" : "text-primary/70"
                )}
              />
            </div>

            {/* Text */}
            <p className="text-sm font-medium text-foreground mb-1">
              {isDragging
                ? "Drop your file here"
                : "Drag and drop your document"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              or use the buttons below
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <label htmlFor={`file-upload-${type}`}>
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className="w-full sm:w-auto"
                >
                  <span className="cursor-pointer inline-flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Browse Files
                  </span>
                </Button>
                <input
                  id={`file-upload-${type}`}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Mobile camera option */}
              <label htmlFor={`camera-upload-${type}`} className="sm:hidden">
                <Button variant="outline" size="sm" asChild className="w-full">
                  <span className="cursor-pointer inline-flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Take Photo
                  </span>
                </Button>
                <input
                  id={`camera-upload-${type}`}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Supported formats */}
            <p className="text-[11px] text-muted-foreground mt-4">
              JPG, PNG, WebP, or PDF • Max 5MB
            </p>
          </div>
        )}

      {/* Preview Card - Show only when file is selected */}
      {selectedFile && (
        <Card className="border-2 border-primary/20 overflow-hidden">
          <CardContent className="p-0">
            {/* Image Preview */}
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Document preview"
                  className="w-full h-48 sm:h-56 object-contain bg-muted"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <button
                  onClick={handleRemove}
                  disabled={isUploading}
                  className={cn(
                    "absolute top-3 right-3 p-2 rounded-full",
                    "bg-background/90 backdrop-blur-sm shadow-lg",
                    "hover:bg-destructive hover:text-destructive-foreground",
                    "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* PDF/File Preview */
              <div className="p-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={handleRemove}
                    disabled={isUploading}
                    className={cn(
                      "p-2 rounded-lg",
                      "hover:bg-destructive/10 hover:text-destructive",
                      "transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="p-4 pt-0">
              <Button
                onClick={() => void handleUpload()}
                disabled={isUploading}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentUpload;
