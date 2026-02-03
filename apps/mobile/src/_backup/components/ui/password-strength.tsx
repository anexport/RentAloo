import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface PasswordStrengthProps {
  password: string;
}

const getPasswordStrength = (password: string) => {
  let strength = 0;
  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password)) strength += 25;
  
  return strength;
};

const getStrengthLabel = (strength: number) => {
  if (strength === 0) return { label: "", color: "" };
  if (strength <= 25) return { label: "Weak", color: "text-destructive" };
  if (strength <= 50) return { label: "Fair", color: "text-orange-500" };
  if (strength <= 75) return { label: "Good", color: "text-yellow-500" };
  return { label: "Strong", color: "text-green-500" };
};

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  const strength = getPasswordStrength(password);
  const { label, color } = getStrengthLabel(strength);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <Progress value={strength} className="h-2" />
      {label && <p className={cn("text-xs font-medium", color)}>{label}</p>}
    </div>
  );
};

