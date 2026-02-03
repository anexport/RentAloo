import React, { createContext, useEffect, useState } from "react";
import type {
  User,
  Session,
  AuthError,
  PostgrestError,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import i18n from "@/i18n/config";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
// SECURITY: Admin role cannot be assigned during client-side signup
// Admin roles can only be assigned through the admin-users edge function
type UserMetadata = { role: "renter" | "owner" } & Record<string, unknown>;
type UpdateProfileError = AuthError | PostgrestError;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    userData: UserMetadata
  ) => Promise<{ error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null; user: User | null }>;
  signInWithOAuth: (
    provider: "google" | "github" | "facebook" | "twitter",
    redirectTo?: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateProfile: (
    updates: ProfileUpdate
  ) => Promise<{ error: UpdateProfileError | null }>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const syncLanguagePreference = (session: Session | null) => {
    if (!session?.user?.user_metadata?.language_preference) return;

    const userLang = session.user.user_metadata.language_preference;
    if (typeof userLang !== "string") return;

    if (i18n.language === userLang) return;

    try {
      void i18n.changeLanguage(userLang);
      localStorage.setItem("userLanguagePreference", userLang);
    } catch (error) {
      console.error("Failed to sync language preference:", error);
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        syncLanguagePreference(session);

        void supabase.realtime
          .setAuth(session?.access_token ?? null)
          .catch((realtimeError) => {
            console.error("Failed to set realtime auth:", realtimeError);
          });
      } catch (error) {
        console.error("Error getting session:", error);
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    };

    void getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      syncLanguagePreference(session);

      void supabase.realtime
        .setAuth(session?.access_token ?? null)
        .catch((error) => {
          console.error("Failed to set realtime auth:", error);
        });

      // Profile creation is now handled by database trigger
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    userData: UserMetadata
  ) => {
    // SECURITY: Admin role is prevented at the type level (UserMetadata excludes "admin")
    // Database trigger also provides server-side protection against admin role assignment
    // Admin roles can only be assigned through the admin-users edge function

    // Client-side role validation: enforce only allowed role values
    const ALLOWED_ROLES = ["renter", "owner"] as const;
    const providedRole = userData?.role;

    if (
      providedRole &&
      !ALLOWED_ROLES.includes(providedRole as (typeof ALLOWED_ROLES)[number])
    ) {
      return {
        error: {
          message: `Invalid role: "${providedRole}". Only "${ALLOWED_ROLES.join(
            '" or "'
          )}" roles are allowed for signup.`,
          name: "AuthError",
          status: 400,
        } as AuthError,
      };
    }

    // Sanitize: ensure role is set to a safe default if missing or invalid
    // (This provides defense in depth, though TypeScript should prevent invalid roles)
    const sanitizedUserData: UserMetadata = {
      ...userData,
      role:
        providedRole &&
        ALLOWED_ROLES.includes(providedRole as (typeof ALLOWED_ROLES)[number])
          ? providedRole
          : "renter", // Safe default
    };

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: sanitizedUserData,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error, user: data?.user ?? null };
    } catch (error) {
      return { error: error as AuthError, user: null };
    }
  };

  const signInWithOAuth = async (
    provider: "google" | "github" | "facebook" | "twitter",
    redirectTo?: string
  ) => {
    try {
      // Detect if running in native mobile app
      const isNative = typeof window !== 'undefined' &&
        'Capacitor' in window &&
        // @ts-expect-error - Capacitor is added by native runtime
        window.Capacitor?.isNativePlatform?.() === true;

      if (isNative) {
        // Native mobile: use deep link redirect
        const deepLinkRedirect = 'rentaloo://auth-callback';
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: deepLinkRedirect,
            skipBrowserRedirect: true, // Return URL instead of navigating
          },
        });

        if (error) return { error };

        // Open OAuth URL in system browser
        if (data?.url) {
          // Dynamic import to avoid bundling Capacitor in web build
          // @ts-expect-error - Capacitor global exists in native runtime
          if (window.Capacitor?.Plugins?.Browser) {
            // @ts-expect-error - Browser plugin is available in native
            await window.Capacitor.Plugins.Browser.open({
              url: data.url,
              presentationStyle: 'popover'
            });
          }
        }

        return { error: null };
      } else {
        // Web: use normal redirect
        const redirectUrl = redirectTo || `${window.location.origin}/`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUrl,
          },
        });
        return { error };
      }
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user?.id) {
      return {
        error: {
          message: "User not authenticated",
          name: "AuthError",
          status: 401,
        } as UpdateProfileError,
      };
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
      if (error) {
        return { error };
      }
      return { error: null };
    } catch (error) {
      return {
        error: error as UpdateProfileError,
      };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
