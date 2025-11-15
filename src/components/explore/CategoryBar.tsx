import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { Package } from "lucide-react";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

type Category = Database["public"]["Tables"]["categories"]["Row"];

type CategoryWithCount = Category & {
  item_count?: number;
};

type Props = {
  activeCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
};

const CategoryBar = ({ activeCategoryId, onCategoryChange }: Props) => {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .is("parent_id", null)
          .order("name");

        if (error) {
          console.error("Error fetching categories:", error);
          toast({
            title: "Error loading categories",
            description: "Failed to load categories. Please try again later.",
            variant: "destructive",
          });
          setCategories([]);
          return;
        }

        // Fetch counts for each category in parallel
        const categoriesWithCounts = await Promise.all(
          (data || []).map(async (cat) => {
            const { count } = await supabase
              .from("equipment")
              .select("*", { count: "exact", head: true })
              .eq("category_id", cat.id)
              .eq("is_available", true);

            return { ...cat, item_count: count || 0 };
          })
        );

        setCategories(categoriesWithCounts);
      } catch (err) {
        console.error("Unexpected error fetching categories:", err);
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        toast({
          title: "Error loading categories",
          description: message,
          variant: "destructive",
        });
        setCategories([]);
      }
    };
    void load();
  }, []);

  const CategoryPill = ({
    id,
    name,
    icon: Icon,
    count,
    isActive,
    onClick,
  }: {
    id: string;
    name: string;
    icon: React.ElementType;
    count?: number;
    isActive: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      aria-label={`Category ${name}`}
      aria-pressed={isActive}
      className={cn(
        "group relative inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full transition-all duration-200 whitespace-nowrap text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isActive
          ? "bg-foreground text-background shadow-sm"
          : "bg-background hover:bg-muted border border-border hover:border-foreground/20 text-foreground hover:shadow-sm"
      )}
    >
      {/* Icon */}
      <Icon
        className={cn(
          "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
          isActive ? "text-background" : "text-foreground"
        )}
      />

      {/* Category Name */}
      <span className="max-w-[140px] truncate">{name}</span>

      {/* Count Badge */}
      {typeof count === "number" && count > 0 && (
        <Badge
          variant={isActive ? "outline" : "secondary"}
          className={cn(
            "h-5 px-1.5 text-[10px] font-semibold min-w-[20px] justify-center",
            isActive
              ? "bg-background/20 text-background border-background/30"
              : "bg-muted text-muted-foreground"
          )}
        >
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </button>
  );

  return (
    <div className="w-full">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-2 py-1">
          {/* All Categories */}
          <CategoryPill
            id="all"
            name="All"
            icon={Package}
            isActive={activeCategoryId === "all"}
            onClick={() => onCategoryChange("all")}
          />

          {/* Individual Categories */}
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.name);
            return (
              <CategoryPill
                key={cat.id}
                id={cat.id}
                name={cat.name}
                icon={Icon}
                count={cat.item_count}
                isActive={activeCategoryId === cat.id}
                onClick={() => onCategoryChange(cat.id)}
              />
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  );
};

export default CategoryBar;
