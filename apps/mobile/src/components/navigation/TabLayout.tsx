import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Search, MessageCircle, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/explore', icon: Search, label: 'Explore' },
  { path: '/messages', icon: MessageCircle, label: 'Messages' },
  { path: '/rentals', icon: Calendar, label: 'Rentals' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export function TabLayout() {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Main content */}
      <main className="flex-1 main-content">
        <Outlet />
      </main>

      {/* Tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
        <div
          className="flex justify-around items-center"
          style={{
            height: 'var(--tab-bar-height)',
            paddingBottom: 'var(--safe-area-inset-bottom)',
          }}
        >
          {tabs.map((tab) => {
            const isActive = location.pathname.startsWith(tab.path);
            const Icon = tab.icon;

            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 py-2 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-6 w-6" />
                <span className="text-xs mt-1">{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
