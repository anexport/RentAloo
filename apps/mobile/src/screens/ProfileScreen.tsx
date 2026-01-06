import { ChevronRight, LogOut, Bell, Shield, HelpCircle, Moon } from 'lucide-react';
import { MobileHeader } from '@/components/navigation/MobileHeader';
import { useAuth } from '@/contexts/AuthContext';

export function ProfileScreen() {
  const { user, signOut } = useAuth();

  const menuItems = [
    { icon: Bell, label: 'Notifications', href: '/settings/notifications' },
    { icon: Shield, label: 'Verification', href: '/settings/verification' },
    { icon: Moon, label: 'Appearance', href: '/settings/appearance' },
    { icon: HelpCircle, label: 'Help & Support', href: '/settings/help' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader title="Profile" />

      <div className="flex-1 p-4">
        {/* User info */}
        <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border mb-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-muted-foreground">
            {user?.email?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">
              {user?.user_metadata?.full_name || 'User'}
            </h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Menu items */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-4 p-4 hover:bg-muted transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-4 p-4 mt-4 bg-card rounded-xl border border-border hover:bg-muted transition-colors text-destructive"
        >
          <LogOut className="h-5 w-5" />
          <span className="flex-1 text-left font-medium">Sign Out</span>
        </button>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Rentaloo v1.0.0
        </p>
      </div>
    </div>
  );
}
