import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export function MobileHeader({
  title,
  showBack = false,
  onBack,
  rightAction,
  className,
}: MobileHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-background border-b border-border',
        className
      )}
      style={{ paddingTop: 'var(--safe-area-inset-top)' }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side */}
        <div className="w-10">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-foreground hover:bg-muted rounded-full"
              aria-label="Go back"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Title */}
        <h1 className="text-lg font-semibold truncate">{title}</h1>

        {/* Right side */}
        <div className="w-10 flex justify-end">{rightAction}</div>
      </div>
    </header>
  );
}
