import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export const useAdminAccess = () => {
  const { user } = useAuth();

  const metadataAdmin = user?.user_metadata?.role === "admin";

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-access", user?.id],
    enabled: !!user?.id && !metadataAdmin,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id as string)
        .maybeSingle();

      if (error) throw error;
      return data?.role === "admin";
    },
  });

  if (!user?.id) {
    return { isAdmin: false, loading: false, error: null } as const;
  }

  return {
    isAdmin: Boolean(metadataAdmin || data),
    loading: metadataAdmin ? false : isLoading,
    error: error ? error.message : null,
  } as const;
};
