import DashboardLayout from "@/components/layout/DashboardLayout";
import InspectionsOverview from "@/components/inspection/InspectionsOverview";

const RenterInspectionsPage = () => {
  return (
    <DashboardLayout>
      <InspectionsOverview role="renter" />
    </DashboardLayout>
  );
};

export default RenterInspectionsPage;
