import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import SavedEquipmentTab from "@/components/renter/SavedEquipmentTab";

const RenterSavedPage = () => {
  const { t } = useTranslation("dashboard");

  return (
    <DashboardLayout>
      <PageShell
        title={t("renter.saved.title", { defaultValue: "Saved Equipment" })}
        description={t("renter.saved.description", { defaultValue: "Equipment you've saved for later" })}
        icon={Heart}
        iconColor="text-rose-500"
      >
        <SavedEquipmentTab />
      </PageShell>
    </DashboardLayout>
  );
};

export default RenterSavedPage;
