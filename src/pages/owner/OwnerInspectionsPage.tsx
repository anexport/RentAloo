import DashboardLayout from "@/components/layout/DashboardLayout";
import InspectionsOverview from "@/components/inspection/InspectionsOverview";

const OwnerInspectionsPage = () => {
  return (
    <DashboardLayout>
      <InspectionsOverview role="owner" />
    </DashboardLayout>
  );
};

export default OwnerInspectionsPage;
