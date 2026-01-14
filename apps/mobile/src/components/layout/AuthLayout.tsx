import { Outlet } from 'react-router-dom';

/**
 * AuthLayout - Layout for authentication pages (login, signup, verify)
 * NO bottom navigation bar
 */
export function AuthLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

export default AuthLayout;
