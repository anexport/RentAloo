import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ReviewList from "@/components/reviews/ReviewList";

const OwnerReviewsPage = () => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("owner.reviews.section_title")}
          </h1>
          <p className="text-muted-foreground">
            {t("owner.reviews.section_description")}
          </p>
        </div>
        <ReviewList
          revieweeId={user.id}
          showSummary={true}
          showEquipment={true}
        />
      </div>
    </DashboardLayout>
  );
};

export default OwnerReviewsPage;
