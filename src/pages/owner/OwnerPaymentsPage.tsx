import { useTranslation } from "react-i18next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import EscrowDashboard from "@/components/payment/EscrowDashboard";
import TransactionHistory from "@/components/payment/TransactionHistory";

const OwnerPaymentsPage = () => {
  const { t } = useTranslation("dashboard");

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("owner.payments.section_title")}
          </h1>
          <p className="text-muted-foreground">
            {t("owner.payments.section_description")}
          </p>
        </div>

        {/* Escrow Dashboard */}
        <EscrowDashboard />

        {/* Transaction History */}
        <div className="mt-8">
          <TransactionHistory userType="owner" />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OwnerPaymentsPage;
