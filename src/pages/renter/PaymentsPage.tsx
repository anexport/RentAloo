import DashboardLayout from "@/components/layout/DashboardLayout";
import PageHeader from "@/components/layout/PageHeader";
import TransactionHistory from "@/components/payment/TransactionHistory";

const PaymentsPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <PageHeader
          title="Payment History"
          description="Track all your rental payments and transactions"
        />

        {/* Transaction History */}
        <TransactionHistory userType="renter" />
      </div>
    </DashboardLayout>
  );
};

export default PaymentsPage;
