import { LifeBuoy, MessageSquare, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import { ContentCard, ContentCardHeader, ContentCardContent } from "@/components/ui/ContentCard";
import { Button } from "@/components/ui/button";

const SupportPage = () => {
  return (
    <DashboardLayout>
      <PageShell
        title="Support & Help"
        description="Get help fast, report an issue, or review your open tickets."
        icon={LifeBuoy}
        iconColor="text-primary"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ContentCard
            variant="interactive"
            className="animate-content-reveal"
            style={{ "--stagger-index": 0 } as React.CSSProperties}
          >
            <ContentCardHeader
              title={
                <span className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Message support
                </span>
              }
              description="Chat with us if something feels off with your booking or listing."
            />
            <ContentCardContent className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                We respond quickest in Messages.
              </p>
              <Button asChild variant="default">
                <Link to="/messages">Open messages</Link>
              </Button>
            </ContentCardContent>
          </ContentCard>

          <ContentCard
            variant="interactive"
            className="animate-content-reveal"
            style={{ "--stagger-index": 1 } as React.CSSProperties}
          >
            <ContentCardHeader
              title={
                <span className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-primary" />
                  Report an issue
                </span>
              }
              description="File a claim for damage or let us know about safety concerns."
            />
            <ContentCardContent className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Start from your booking to attach details automatically.
              </p>
              <Button asChild variant="outline">
                <Link to="/renter/dashboard?tab=bookings">Go to bookings</Link>
              </Button>
            </ContentCardContent>
          </ContentCard>
        </div>
      </PageShell>
    </DashboardLayout>
  );
};

export default SupportPage;
