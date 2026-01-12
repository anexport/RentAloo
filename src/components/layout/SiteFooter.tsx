import { Link } from "react-router-dom";
import { Mountain } from "lucide-react";

const SiteFooter = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <Link to="/" className="inline-flex items-center gap-2">
              <Mountain className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-lg font-semibold text-foreground">
                Vaymo
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              Rent outdoor gear from locals nearby. Save money, earn from unused
              equipment, and keep adventures simple.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">Product</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link className="block hover:text-foreground" to="/explore">
                  Browse equipment
                </Link>
                <Link className="block hover:text-foreground" to="/register/owner">
                  Become an owner
                </Link>
                <Link className="block hover:text-foreground" to="/help">
                  Help
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">Company</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link className="block hover:text-foreground" to="/terms">
                  Terms
                </Link>
                <Link className="block hover:text-foreground" to="/privacy">
                  Privacy
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">Get started</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <Link className="block hover:text-foreground" to="/?signup=true&role=renter">
                  Create account
                </Link>
                <Link className="block hover:text-foreground" to="/?login=true">
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Vaymo. All rights reserved.</span>
          <span>
            Built for trust: secure payments, verified identities, and clear
            policies.
          </span>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
