import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
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

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
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

      // For mobile, we need a deep link redirect URL
      const redirectTo = 'rentaloo://auth/callback';

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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        error,
        signInWithPassword,
        signInWithOAuth,
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
