import { useTranslation } from "react-i18next";
import { PiggyBank } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import EscrowDashboard from "@/components/payment/EscrowDashboard";
import TransactionHistory from "@/components/payment/TransactionHistory";

const OwnerPaymentsPage = () => {
  const { t } = useTranslation("dashboard");

  return (
    <DashboardLayout>
      <PageShell
        title={t("owner.payments.section_title", { defaultValue: "Payouts & Earnings" })}
        description={t("owner.payments.section_description", {
          defaultValue: "Track your earnings and manage payout settings"
        })}
        icon={PiggyBank}
        iconColor="text-emerald-500"
      >
        {/* Escrow Dashboard */}
        <EscrowDashboard />

        {/* Transaction History */}
        <div className="mt-6">
          <TransactionHistory userType="owner" />
        </div>
      </PageShell>
    </DashboardLayout>
  );
};

export default OwnerPaymentsPage;
