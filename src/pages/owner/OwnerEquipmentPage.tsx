import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import EquipmentManagement from "@/components/EquipmentManagement";

const OwnerEquipmentPage = () => {
  const { t } = useTranslation("dashboard");

  return (
    <DashboardLayout>
      <PageShell
        title={t("owner.tabs.equipment", { defaultValue: "My Equipment" })}
        description={t("owner.overview.quick_actions.manage_listings.description", {
          defaultValue: "Add, edit, and manage your equipment listings"
        })}
        icon={Package}
        iconColor="text-emerald-500"
      >
        <EquipmentManagement />
      </PageShell>
    </DashboardLayout>
  );
};

export default OwnerEquipmentPage;
