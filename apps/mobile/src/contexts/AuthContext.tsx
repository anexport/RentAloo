import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, Session, AuthChangeEvent, AuthError } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/lib/supabase';
import {
  signInWithPassword as apiSignIn,
  signOut as apiSignOut,
  signInWithOAuth as apiSignInWithOAuth,
  getSession,
  setRealtimeAuth,
} from '@rentaloo/shared/api';

// User metadata for signup (excludes admin role for security)
type UserMetadata = {
  role: 'renter' | 'owner';
  fullName: string;
  location: string;
  interests?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'advanced';
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
  signUp: (email: string, password: string, userData: UserMetadata) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { session: currentSession } = await getSession(supabase);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.access_token) {
          setRealtimeAuth(supabase, currentSession.access_token);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, newSession: Session | null) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.access_token) {
        setRealtimeAuth(supabase, newSession.access_token);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setError(null);
      setLoading(true);

      try {
        const { session: newSession, error: signInError } = await apiSignIn(
          supabase,
          email,
          password
        );

        if (signInError) {
          setError(signInError.message);
          return false;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign in failed');
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signInWithOAuth = useCallback(
    async (provider: 'google' | 'apple'): Promise<void> => {
      setError(null);

      // Use HTTPS bridge URL that's in Supabase allowlist
      // The bridge page will redirect to the app via deep link
      // This avoids needing to add rentaloo:// to Supabase Dashboard
      const BRIDGE_URL = import.meta.env.VITE_APP_URL 
        ? `${import.meta.env.VITE_APP_URL}/auth/bridge`
        : 'https://rentaloo.app/auth/bridge';
      
      const redirectTo = Capacitor.isNativePlatform() 
        ? BRIDGE_URL  // Mobile: use HTTPS bridge → deep link
        : 'rentaloo://auth/callback';  // Fallback direct deep link

      console.log('[OAuth] Using redirectTo:', redirectTo);

      try {
        const { url, error: oauthError } = await apiSignInWithOAuth(
          supabase,
          provider,
          redirectTo
        );

        if (oauthError) {
          setError(oauthError.message);
          return;
        }

        if (url) {
          // Open in system browser for OAuth flow
          // The deep link will bring user back to the app
          if (Capacitor.isNativePlatform()) {
            // Use Capacitor Browser for proper Custom Tabs behavior
            await Browser.open({ url });
          } else {
            // Fallback for web
            window.open(url, '_blank');
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OAuth failed');
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await apiSignOut(supabase);
      setSession(null);
      setUser(null);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, userData: UserMetadata) => {
      // Client-side role validation
      const ALLOWED_ROLES = ['renter', 'owner'] as const;
      const providedRole = userData?.role;

      if (
        providedRole &&
        !ALLOWED_ROLES.includes(providedRole as (typeof ALLOWED_ROLES)[number])
      ) {
        return {
          error: {
            message: `Invalid role: "${providedRole}". Only "renter" or "owner" roles are allowed for signup.`,
            name: 'AuthError',
            status: 400,
          } as AuthError,
        };
      }

      // Sanitize: ensure role is set to a safe default if missing or invalid
      const sanitizedUserData: UserMetadata = {
        ...userData,
        role:
          providedRole &&
          ALLOWED_ROLES.includes(providedRole as (typeof ALLOWED_ROLES)[number])
            ? providedRole
            : 'renter', // Safe default
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
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        signInWithPassword,
        signInWithOAuth,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
