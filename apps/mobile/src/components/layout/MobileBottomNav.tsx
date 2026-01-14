import { NavLink, useLocation } from 'react-router-dom';
import { Search, Heart, MessageSquare, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { to: '/explore', icon: Search, label: 'Explore' },
  { to: '/favorites', icon: Heart, label: 'Favorites' },
  { to: '/messages', icon: MessageSquare, label: 'Messages' },
  { to: '/rentals', icon: Calendar, label: 'Rentals' },
  { to: '/profile', icon: User, label: 'Profile' },
] as const;

export function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  // Only show for authenticated users
  if (!user) return null;

  // Don't show on specific pages that have their own navigation
  const hideOnPaths = ['/login', '/signup', '/auth', '/verify'];
  if (hideOnPaths.some((path) => location.pathname.startsWith(path))) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: 'var(--safe-area-inset-bottom)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around h-16">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
          
          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors',
                'min-h-[44px] active:scale-95',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={label}
            >
              <div
                className={cn(
                  'relative flex items-center justify-center w-6 h-6',
                  isActive && 'after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-primary'
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 transition-transform',
                    isActive && 'scale-110'
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className="font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileBottomNav;
