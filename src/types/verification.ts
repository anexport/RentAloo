export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export type VerificationType = "identity" | "phone" | "email" | "address";

export interface VerificationDocument {
  id: string;
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  documentUrl?: string;
  submittedAt?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface TrustScore {
  overall: number; // 0-100
  components: {
    verification: number;
    reviews: number;
    completedBookings: number;
    responseTime: number;
    accountAge: number;
  };
}

/**
 * User verification profile with verification status for each type.
 * 
 * Note: Only identity and phone have detailed tracking fields (status, documentUrl,
 * submittedAt, rejectionReason) because:
 * - Identity: Requires document upload and admin review workflow
 * - Phone: Requires OTP/SMS verification workflow
 * - Email: Uses Supabase Auth's built-in email_confirmed_at (no custom workflow needed)
 * - Address: Not yet implemented; will be added when address verification is supported
 */
export interface UserVerificationProfile {
  userId: string;
  identityVerified: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  addressVerified: boolean;
  trustScore: TrustScore;
  verifiedAt?: string;
  // Pending verification status for identity and phone (see doc comment above)
  identityStatus?: VerificationStatus;
  identityDocumentUrl?: string;
  identitySubmittedAt?: string;
  identityRejectionReason?: string;
  phoneStatus?: VerificationStatus;
  phoneSubmittedAt?: string;
  phoneRejectionReason?: string;
}

export interface VerificationBadgeProps {
  type: VerificationType;
  verified: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export interface DocumentUploadData {
  type: VerificationType;
  file: File;
  metadata?: {
    documentType?: string;
    expiryDate?: string;
    documentNumber?: string;
  };
}

export interface RenterScreeningData {
  userId: string;
  fullName: string;
  email: string;
  trustScore: TrustScore;
  verificationStatus: UserVerificationProfile;
  completedBookings: number;
  averageRating: number;
  memberSince: string;
  recentReviews: Array<{
    rating: number;
    comment: string;
    date: string;
  }>;
}
