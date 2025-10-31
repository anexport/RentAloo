import type { DateRange } from "react-day-picker";

export type SearchBarFilters = {
  search: string;
  location: string;
  condition: string;
  priceMin?: number;
  priceMax?: number;
  dateRange?: DateRange;
  equipmentType?: string;
};

