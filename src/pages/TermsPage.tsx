import { useNavigate } from "react-router-dom";
import ExploreHeader from "@/components/layout/ExploreHeader";
import PageHeader from "@/components/layout/PageHeader";

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <ExploreHeader
        onLoginClick={() => navigate("/?login=true")}
        onSignupClick={() => navigate("/?signup=true&role=renter")}
      />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <PageHeader
          title="Terms of Service"
          description="The rules for using Vaymo."
        />

        <div className="prose prose-zinc dark:prose-invert max-w-none">
          <p>
            This page is a placeholder. Replace it with your official Terms of
            Service before launching.
          </p>
          <h2>What to include</h2>
          <ul>
            <li>Eligibility, accounts, and acceptable use</li>
            <li>Listings, bookings, cancellations, and refunds</li>
            <li>Fees, payouts, and payment processing</li>
            <li>Insurance/claims process and limitations</li>
            <li>Disputes, liability, and governing law</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
