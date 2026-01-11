import { useState, useEffect } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { MapPin, X } from "lucide-react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const POPULAR_LOCATIONS = [
  "San Francisco, CA",
  "Los Angeles, CA",
  "Seattle, WA",
  "Portland, OR",
  "Denver, CO",
  "Austin, TX",
  "Boulder, CO",
  "Park City, UT",
  "Lake Tahoe, CA",
  "Moab, UT",
];

const RECENT_LOCATIONS_KEY = "vaymo_recent_locations";

const LocationCombobox = ({
  value,
  onChange,
  placeholder = "Search locations...",
}: Props) => {
  const [recentLocations, setRecentLocations] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_LOCATIONS_KEY);
    if (stored) {
      try {
        setRecentLocations(JSON.parse(stored));
      } catch {
        setRecentLocations([]);
      }
    }
  }, []);

  const handleSelect = (location: string) => {
    onChange(location);

    // Add to recent locations
    const updated = [
      location,
      ...recentLocations.filter((l) => l !== location),
    ].slice(0, 5);
    setRecentLocations(updated);
    try {
      localStorage.setItem(RECENT_LOCATIONS_KEY, JSON.stringify(updated));
    } catch {
      // Silently fail if localStorage is unavailable
    }
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="space-y-4">
      <Command>
        <div className="relative">
          <CommandInput
            placeholder={placeholder}
            value={value}
            onValueChange={onChange}
          />
          {value && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={handleClear}
              aria-label="Clear location"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CommandList>
          <CommandEmpty>No locations found.</CommandEmpty>

          {recentLocations.length > 0 && (
            <CommandGroup heading="Recent searches">
              {recentLocations.map((loc) => (
                <CommandItem
                  key={`recent-${loc}`}
                  onSelect={() => handleSelect(loc)}
                  className="cursor-pointer"
                >
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                  {loc}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandGroup heading="Popular destinations">
            {POPULAR_LOCATIONS.map((loc) => (
              <CommandItem
                key={`popular-${loc}`}
                onSelect={() => handleSelect(loc)}
                className="cursor-pointer"
              >
                <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                {loc}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
};

export default LocationCombobox;
