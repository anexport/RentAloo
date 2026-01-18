import * as React from "react";
import { cn } from "@/lib/utils";

interface FloatingInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Floating label input component
 * Label floats above the input when focused or when the input has a value
 */
const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);
    const generatedId = React.useId();
    if (import.meta.env.DEV && id === "") {
      // Empty ids break label associations; fall back to generated id instead.
      console.warn("FloatingInput received an empty id; using generated id.");
    }
    const inputId = id && id.length > 0 ? id : `floating-input-${generatedId}`;
    const internalRef = React.useRef<HTMLInputElement>(null);

    // Merge refs to support both forwarded ref and internal ref
    const mergedRef = React.useMemo(() => {
      return (node: HTMLInputElement | null) => {
        (
          internalRef as React.MutableRefObject<HTMLInputElement | null>
        ).current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current =
            node;
        }
      };
    }, [ref]);

    // Initialize hasValue from defaultValue or actual DOM value on mount
    // Use != null to detect any non-null/undefined value (including 0 and "")
    React.useEffect(() => {
      const hasDefaultValue = props.defaultValue != null;
      const hasDomValue = Boolean(internalRef.current?.value);
      if (hasDefaultValue || hasDomValue) {
        setHasValue(true);
      }
    }, [props.defaultValue]); // Re-run if defaultValue changes

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      setHasValue(e.target.value.length > 0);
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0);
      props.onChange?.(e);
    };

    // Check for prop presence rather than truthiness so controlled inputs with value="" float correctly
    const hasControlledValue = "value" in props && props.value !== undefined;
    const hasDefaultValueProp = props.defaultValue != null;
    const isFloating =
      isFocused || hasValue || hasControlledValue || hasDefaultValueProp;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="relative">
        <input
          ref={mergedRef}
          id={inputId}
          data-slot="floating-input"
          className={cn(
            "peer h-14 w-full rounded-md border bg-transparent px-3 pt-5 pb-2 text-base shadow-xs transition-[color,box-shadow,border-color] outline-none md:text-sm",
            "border-input placeholder-transparent",
            "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            error &&
              "border-destructive ring-destructive/20 focus-visible:border-destructive focus-visible:ring-destructive/20",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-input/30",
            className
          )}
          placeholder={label}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          aria-invalid={!!error}
          aria-describedby={errorId}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "absolute left-3 transition-all duration-200 ease-out pointer-events-none",
            "text-muted-foreground",
            isFloating
              ? "top-2 text-xs font-medium"
              : "top-1/2 -translate-y-1/2 text-base md:text-sm",
            isFocused && "text-primary",
            error && "text-destructive"
          )}
        >
          {label}
        </label>
        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-destructive"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";

export { FloatingInput };
