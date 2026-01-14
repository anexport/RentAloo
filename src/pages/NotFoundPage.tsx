import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ExploreHeader from "@/components/layout/ExploreHeader";
import { Button } from "@/components/ui/button";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <ExploreHeader
        onLoginClick={() => navigate("/?login=true")}
        onSignupClick={() => navigate("/?signup=true&role=renter")}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">
            Page not found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The page you’re looking for doesn’t exist or may have moved.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/">
                Go home <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/explore">Browse equipment</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFoundPage;
