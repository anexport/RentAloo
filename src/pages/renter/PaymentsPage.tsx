import { CreditCard } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PageShell from "@/components/layout/PageShell";
import TransactionHistory from "@/components/payment/TransactionHistory";

const PaymentsPage = () => {
  return (
    <DashboardLayout>
      <PageShell
        title="Payment History"
        description="Track all your rental payments and transactions"
        icon={CreditCard}
        iconColor="text-blue-500"
      >
        <TransactionHistory userType="renter" />
      </PageShell>
    </DashboardLayout>
  );
};

export default PaymentsPage;
