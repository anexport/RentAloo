import React, { createContext, useContext, useEffect, useState } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    userData: { role: "renter" | "owner" }
  ) => Promise<{ error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: any) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Create user profile on sign up
      if (event === "SIGNED_UP" && session?.user) {
        const { role } = session.user.user_metadata;
        await createUserProfile(session.user, role);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const createUserProfile = async (user: User, role: "renter" | "owner") => {
    try {
      // Create base profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email!,
        role,
      } as any);

      if (profileError) throw profileError;

      // Create role-specific profile
      if (role === "renter") {
        const { error: renterError } = await supabase
          .from("renter_profiles")
          .insert({
            profile_id: user.id,
            verification_status: "unverified",
          } as any);

        if (renterError) throw renterError;
      } else if (role === "owner") {
        const { error: ownerError } = await supabase
          .from("owner_profiles")
          .insert({
            profile_id: user.id,
            verification_level: "unverified",
            earnings_total: 0,
          } as any);

        if (ownerError) throw ownerError;
      }
    } catch (error) {
      console.error("Error creating user profile:", error);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: { role: "renter" | "owner" } & Record<string, any>
  ) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
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

  const updateProfile = async (updates: any) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update(updates as any)
        .eq("id", user?.id!);
      return { error: error as AuthError | null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
