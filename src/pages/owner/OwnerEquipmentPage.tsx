import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import EquipmentManagement from "@/components/EquipmentManagement";

const OwnerEquipmentPage = () => {
  const { t } = useTranslation("dashboard");

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("owner.tabs.equipment")}
          </h1>
          <p className="text-muted-foreground">
            {t("owner.overview.quick_actions.manage_listings.description")}
          </p>
        </div>
        <EquipmentManagement />
      </div>
    </DashboardLayout>
  );
};

export default OwnerEquipmentPage;
