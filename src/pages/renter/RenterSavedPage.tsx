import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SavedEquipmentTab from "@/components/renter/SavedEquipmentTab";

const RenterSavedPage = () => {
  const { t } = useTranslation("dashboard");

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("renter.saved.title", { defaultValue: "Saved Equipment" })}
          </h1>
          <p className="text-muted-foreground">
            {t("renter.saved.description", { defaultValue: "Equipment you've saved for later" })}
          </p>
        </div>
        <SavedEquipmentTab />
      </div>
    </DashboardLayout>
  );
};

export default RenterSavedPage;
