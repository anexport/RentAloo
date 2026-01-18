import { Link, useNavigate } from "react-router-dom";
import { LifeBuoy, MessageSquare, ShieldAlert, ArrowRight } from "lucide-react";
import ExploreHeader from "@/components/layout/ExploreHeader";
import PageHeader from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const HelpPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <ExploreHeader
        onLoginClick={() => void navigate("/?login=true")}
        onSignupClick={() => void navigate("/?signup=true&role=renter")}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <PageHeader
          title="Help & Support"
          description="Get answers fast, report an issue, or reach our team."
        />

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
                Message support
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                If you’re logged in, Messages is the fastest way to reach us.
              </p>
              {user ? (
                <Button asChild>
                  <Link to="/messages">
                    Open messages <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/?login=true">
                    Sign in to message <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />
                Report a safety concern
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                If something feels unsafe, stop the exchange and contact support
                immediately.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" asChild>
                  <Link to="/terms">Read Terms</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/privacy">Read Privacy</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-primary" aria-hidden="true" />
                Need help with a booking?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Claims and booking issues are easiest when started from the
                booking itself (so we can attach details automatically).
              </p>
              <Button asChild variant="outline">
                <Link to="/explore">Browse equipment</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HelpPage;
