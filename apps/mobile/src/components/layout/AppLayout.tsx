import { Outlet } from 'react-router-dom';
import { MobileBottomNav } from './MobileBottomNav';

/**
 * AppLayout - Layout for all authenticated app pages
 * Includes the bottom navigation bar
 */
export function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Main content with padding for bottom nav */}
      <main 
        className="flex-1"
        style={{ 
          paddingBottom: 'calc(4rem + var(--safe-area-inset-bottom))' 
        }}
      >
        <Outlet />
      </main>

      {/* Single bottom navigation bar */}
      <MobileBottomNav />
    </div>
  );
}

export default AppLayout;
