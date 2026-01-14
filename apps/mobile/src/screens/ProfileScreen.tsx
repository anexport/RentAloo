import { useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, Bell, Shield, HelpCircle, Moon, User, Settings, CreditCard } from 'lucide-react';
import { MobileHeader } from '@/components/navigation/MobileHeader';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { icon: User, label: 'Edit Profile', href: '/profile/edit' },
    { icon: CreditCard, label: 'Payment Methods', href: '/profile/payments' },
    { icon: Bell, label: 'Notifications', href: '/profile/notifications' },
    { icon: Shield, label: 'Verification', href: '/verification' },
    { icon: Settings, label: 'Settings', href: '/profile/settings' },
    { icon: HelpCircle, label: 'Help & Support', href: '/support' },
  ];

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.charAt(0).toUpperCase() || '?';
  };

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader title="Profile" />

      <div className="flex-1 p-4 safe-area-bottom">
        {/* User info */}
        <button
          onClick={() => navigate('/profile/edit')}
          className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border mb-6 min-h-11"
        >
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">
              {getInitials(user?.user_metadata?.full_name, user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-left">
            <h2 className="font-semibold text-lg">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>

        {/* Menu items */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => navigate(item.href)}
              className={`w-full flex items-center gap-4 p-4 active:bg-muted transition-colors min-h-11 ${
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
          onClick={handleSignOut}
          className="w-full flex items-center gap-4 p-4 mt-4 bg-card rounded-xl border border-border active:bg-muted transition-colors text-destructive min-h-11"
        >
          <LogOut className="h-5 w-5" />
          <span className="flex-1 text-left font-medium">Sign Out</span>
        </button>

        {/* Version */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Vaymo Mobile v1.0.0
        </p>
      </div>
    </div>
  );
}
