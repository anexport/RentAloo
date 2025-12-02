import { useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

// Fetch favorites function
const fetchFavorites = async (userId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from("user_favorites")
    .select("equipment_id")
    .eq("user_id", userId);

  if (error) throw error;

  return (data || []).map((item) => item.equipment_id);
};

// Add favorite function
const addFavorite = async ({
  userId,
  equipmentId,
}: {
  userId: string;
  equipmentId: string;
}) => {
  const { error } = await supabase.from("user_favorites").insert({
    user_id: userId,
    equipment_id: equipmentId,
  });

  if (error) throw error;
};

// Remove favorite function
const removeFavorite = async ({
  userId,
  equipmentId,
}: {
  userId: string;
  equipmentId: string;
}) => {
  const { error } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("equipment_id", equipmentId);

  if (error) throw error;
};

export const useFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query for fetching favorites
  const {
    data: favorites = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: () => fetchFavorites(user!.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for toggling favorites
  const toggleMutation = useMutation({
    mutationFn: async (equipmentId: string) => {
      if (!user) throw new Error("User not authenticated");

      const isFavorited = favorites.includes(equipmentId);

      if (isFavorited) {
        await removeFavorite({ userId: user.id, equipmentId });
      } else {
        await addFavorite({ userId: user.id, equipmentId });
      }

      return { equipmentId, isFavorited };
    },
    onMutate: async (equipmentId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["favorites", user?.id] });

      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData<string[]>([
        "favorites",
        user?.id,
      ]);

      // Optimistically update
      const isFavorited = favorites.includes(equipmentId);
      queryClient.setQueryData<string[]>(["favorites", user?.id], (old = []) =>
        isFavorited
          ? old.filter((id) => id !== equipmentId)
          : [...old, equipmentId]
      );

      return { previousFavorites };
    },
    onError: (error, _equipmentId, context) => {
      // Rollback on error
      if (context?.previousFavorites) {
        queryClient.setQueryData(
          ["favorites", user?.id],
          context.previousFavorites
        );
      }
      console.error("Error toggling favorite:", error);
    },
    onSettled: () => {
      // Refetch to ensure consistency
      void queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] });
    },
  });

  // Check if equipment is favorited
  const isFavorited = useCallback(
    (equipmentId: string): boolean => {
      return favorites.includes(equipmentId);
    },
    [favorites]
  );

  // Toggle favorite wrapper
  const toggleFavorite = useCallback(
    async (equipmentId: string) => {
      await toggleMutation.mutateAsync(equipmentId);
    },
    [toggleMutation]
  );

  // Subscribe to real-time changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-favorites-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_favorites",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Invalidate query cache on real-time changes
          void queryClient.invalidateQueries({
            queryKey: ["favorites", user.id],
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    favorites,
    favoritesCount: favorites.length,
    isFavorited,
    toggleFavorite,
    loading: isLoading || toggleMutation.isPending,
    refetch,
  };
};
