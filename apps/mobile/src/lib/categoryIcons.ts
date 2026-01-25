import {
  Tent,
  Mountain,
  Bike,
  Waves,
  Snowflake,
  Compass,
  Backpack,
  Camera,
  Pickaxe,
  Fish,
  Package,
  type LucideIcon,
} from "lucide-react";

type CategoryIconMap = Record<string, LucideIcon>;

export const categoryIcons: CategoryIconMap = {
  camping: Tent,
  "camping gear": Tent,
  tent: Tent,
  tents: Tent,
  
  hiking: Mountain,
  "hiking equipment": Mountain,
  
  cycling: Bike,
  bike: Bike,
  bikes: Bike,
  bicycle: Bike,
  
  "water sports": Waves,
  kayak: Waves,
  surfing: Waves,
  paddleboard: Waves,
  
  "winter sports": Snowflake,
  skiing: Snowflake,
  snowboard: Snowflake,
  snowboarding: Snowflake,
  
  climbing: Pickaxe,
  "climbing gear": Pickaxe,
  
  fishing: Fish,
  
  photography: Camera,
  camera: Camera,
  
  backpacking: Backpack,
  backpack: Backpack,
  
  navigation: Compass,
  gps: Compass,
};

export const getCategoryIcon = (categoryName: string): LucideIcon => {
  const normalized = categoryName.toLowerCase().trim();
  return categoryIcons[normalized] || Package;
};
