import { useEffect, useState, useRef, memo } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { Package, ChevronDown, X } from "lucide-react";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { MAX_DISPLAY_COUNT } from "@/config/pagination";

type Category = Database["public"]["Tables"]["categories"]["Row"];

type CategoryWithCount = Category & {
  item_count?: number;
};

type Props = {
  activeCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  className?: string;
};

// Glassmorphism styling to match other controls
const GLASS_BASE =
  "bg-background/90 backdrop-blur-lg border border-white/20 dark:border-white/10";

const CategorySheet = ({
  activeCategoryId,
  onCategoryChange,
  className,
}: Props) => {
  const { t } = useTranslation("equipment");
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [countsLoading, setCountsLoading] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Get the active category name for the trigger
  const activeCategory = categories.find((cat) => cat.id === activeCategoryId);
  const activeCategoryName =
    activeCategoryId === "all"
      ? t("category_bar.all")
      : activeCategory?.name ?? t("category_bar.all");
  const ActiveIcon =
    activeCategoryId === "all"
      ? Package
      : getCategoryIcon(activeCategory?.name ?? "");

  // Close overlay when clicking outside
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        overlayRef.current &&
        !overlayRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .is("parent_id", null)
          .order("name")
          .abortSignal(signal);

        if (error) {
          if (signal.aborted) return;
          console.error("Error fetching categories:", error);
          toast({
            title: t("category_bar.error_title"),
            description: t("category_bar.error_desc"),
            variant: "destructive",
          });
          setCategories([]);
          setCountsLoading(false);
          return;
        }

        if (signal.aborted) return;

        setCategories((data || []).map((cat) => ({ ...cat, item_count: 0 })));

        if (signal.aborted) return;

        const { data: equipmentData, error: equipmentError } = await supabase
          .from("equipment")
          .select("category_id")
          .eq("is_available", true)
          .abortSignal(signal);

        if (equipmentError) {
          if (signal.aborted) return;
          console.error("Error fetching equipment counts:", equipmentError);
          setCountsLoading(false);
          return;
        }

        if (signal.aborted) return;

        const countMap = new Map<string, number>();
        equipmentData?.forEach((item) => {
          const count = countMap.get(item.category_id) || 0;
          countMap.set(item.category_id, count + 1);
        });

        const categoriesWithCounts = (data || []).map((cat) => ({
          ...cat,
          item_count: countMap.get(cat.id) || 0,
        }));

        setCategories(categoriesWithCounts);
        setCountsLoading(false);
      } catch (err) {
        if (signal.aborted) return;
        console.error("Unexpected error fetching categories:", err);
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        toast({
          title: "Error loading categories",
          description: message,
          variant: "destructive",
        });
        setCategories([]);
        setCountsLoading(false);
      }
    };
    void load();

    return () => {
      abortController.abort();
    };
  }, [t]);

  const handleSelectCategory = (categoryId: string) => {
    onCategoryChange(categoryId);
    setOpen(false);
  };

  const CategoryPill = ({
    name,
    icon: Icon,
    count,
    isActive,
    onClick,
    loading = false,
  }: {
    name: string;
    icon: React.ElementType;
    count?: number;
    isActive: boolean;
    onClick: () => void;
    loading?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Filter by ${name}${
        typeof count === "number"
          ? `, ${t("category_bar.items_aria", { count })}`
          : ""
      }`}
      aria-pressed={isActive}
      className={cn(
        "group relative inline-flex items-center gap-1.5 px-3 py-2 rounded-full transition-all duration-200 whitespace-nowrap text-xs font-medium",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        isActive
          ? "bg-foreground text-background shadow-sm"
          : "bg-background hover:bg-muted border border-border hover:border-foreground/20 text-foreground hover:shadow-sm"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
          isActive ? "text-background" : "text-foreground"
        )}
      />
      <span className="max-w-[100px] truncate">{name}</span>
      {(loading || (typeof count === "number" && count > 0)) && (
        <Badge
          variant={isActive ? "outline" : "secondary"}
          className={cn(
            "h-5 px-1.5 text-[10px] font-semibold min-w-[20px] justify-center",
            isActive
              ? "bg-background/20 text-background border-background/30"
              : "bg-muted text-muted-foreground"
          )}
        >
          {loading
            ? "..."
            : count! > MAX_DISPLAY_COUNT
            ? `${MAX_DISPLAY_COUNT}+`
            : count}
        </Badge>
      )}
    </button>
  );

  return (
    <div className="relative">
      {/* Trigger button - compact chip style */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(!open)}
        className={cn(
          "h-10 rounded-full gap-1.5 px-3",
          GLASS_BASE,
          "hover:bg-background/95 shadow-sm",
          open && "ring-2 ring-primary/50",
          className
        )}
        aria-label={t("category_bar.select_category", {
          defaultValue: "Select category",
        })}
        aria-expanded={open}
      >
        <ActiveIcon className="h-4 w-4 shrink-0" />
        <span className="max-w-[60px] truncate text-sm font-medium">
          {activeCategoryName}
        </span>
        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 opacity-60 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </Button>

      {/* Overlay with horizontal scrolling categories */}
      {open && (
        <div
          ref={overlayRef}
          className={cn(
            "fixed left-1/2 -translate-x-1/2 z-50",
            "top-32",
            "w-[calc(100vw-24px)] max-w-[500px]",
            "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
          )}
        >
          <div
            className={cn(
              "rounded-[28px] p-2.5",
              GLASS_BASE,
              "shadow-[0_4px_30px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.1)]"
            )}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center shadow-md hover:bg-foreground/90 transition-colors"
              aria-label={t("common.close", { defaultValue: "Close" })}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {/* Scrollable category pills */}
            <div
              className="overflow-x-auto overflow-y-hidden scrollbar-hide overscroll-x-contain cursor-grab active:cursor-grabbing"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="flex items-center gap-2 py-0.5 px-0.5 w-max">
                {/* All Categories */}
                <CategoryPill
                  name={t("category_bar.all")}
                  icon={Package}
                  isActive={activeCategoryId === "all"}
                  onClick={() => handleSelectCategory("all")}
                />

                {/* Individual Categories */}
                {categories.map((cat) => {
                  const Icon = getCategoryIcon(cat.name);
                  return (
                    <CategoryPill
                      key={cat.id}
                      name={cat.name}
                      icon={Icon}
                      count={cat.item_count}
                      isActive={activeCategoryId === cat.id}
                      onClick={() => handleSelectCategory(cat.id)}
                      loading={countsLoading}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CategorySheet);
