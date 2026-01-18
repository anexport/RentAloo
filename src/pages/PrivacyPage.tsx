import { useNavigate } from "react-router-dom";
import ExploreHeader from "@/components/layout/ExploreHeader";
import PageHeader from "@/components/layout/PageHeader";

const PrivacyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <ExploreHeader
        onLoginClick={() => void navigate("/?login=true")}
        onSignupClick={() => void navigate("/?signup=true&role=renter")}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <PageHeader
          title="Privacy Policy"
          description="How we collect, use, and protect your data."
        />

        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p>
            This page is a placeholder. Replace it with your official Privacy
            Policy before launching.
          </p>
          <h2>What to include</h2>
          <ul>
            <li>What data you collect (account, listings, bookings, payments)</li>
            <li>How you use it (platform operations, security, support)</li>
            <li>Who you share with (e.g., payment processor, analytics)</li>
            <li>Retention, deletion, and data export policies</li>
            <li>Contact details for privacy requests</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;
