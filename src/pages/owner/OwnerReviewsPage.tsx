import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import ReviewList from "@/components/reviews/ReviewList";

const OwnerReviewsPage = () => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <PageShell
        title={t("owner.reviews.section_title", { defaultValue: "Reviews" })}
        description={t("owner.reviews.section_description", {
          defaultValue: "See what renters are saying about your equipment"
        })}
        icon={Star}
        iconColor="text-amber-500"
      >
        <ReviewList
          revieweeId={user.id}
          showSummary={true}
          showEquipment={true}
        />
      </PageShell>
    </DashboardLayout>
  );
};

export default OwnerReviewsPage;
