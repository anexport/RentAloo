import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, MapPin, Search } from "lucide-react";

export type BasicSearchFilters = {
  search: string;
  location: string;
  condition: string; // "all" | "new" | "excellent" | "good" | "fair"
};

type Props = {
  value: BasicSearchFilters;
  onChange: (next: BasicSearchFilters) => void;
  onSubmit: () => void;
};

const SearchBar = ({ value, onChange, onSubmit }: Props) => {
  const [localValue, setLocalValue] = useState<BasicSearchFilters>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleApply = () => {
    onChange(localValue);
    onSubmit();
  };

  return (
    <div className="w-full rounded-full border border-input bg-card shadow-sm overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] items-stretch">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Search equipment"
            placeholder="Search equipment"
            className="h-12 pl-9 rounded-none border-0 focus-visible:ring-0"
            value={localValue.search}
            onChange={(e) =>
              setLocalValue({ ...localValue, search: e.target.value })
            }
          />
        </div>
        <div className="relative border-t md:border-t-0 md:border-l border-border">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Location"
            placeholder="Where?"
            className="h-12 pl-9 rounded-none border-0 focus-visible:ring-0"
            value={localValue.location}
            onChange={(e) =>
              setLocalValue({ ...localValue, location: e.target.value })
            }
          />
        </div>
        <div className="border-t md:border-t-0 md:border-l border-border flex">
          <Select
            value={localValue.condition}
            onValueChange={(v) =>
              setLocalValue({ ...localValue, condition: v })
            }
          >
            <SelectTrigger
              aria-label="Condition"
              className="h-12 rounded-none border-0 focus:ring-0"
            >
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All conditions</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="border-t md:border-t-0 md:border-l border-border flex items-center justify-end">
          <div className="flex items-center gap-2 px-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Set dates">
                  <Calendar className="h-4 w-4 mr-2" /> Dates
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Select dates (placeholder)</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground">
                  Date picker integration can be added later.
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={handleApply} aria-label="Search" className="h-9">
              Search
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
