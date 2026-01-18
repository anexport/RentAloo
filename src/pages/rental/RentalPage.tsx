import DashboardLayout from "@/components/layout/DashboardLayout";
import { createMinWidthQuery } from "@/config/breakpoints";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import ActiveRentalPage from "@/pages/rental/ActiveRentalPage";

const RentalPage = () => {
  const isDesktop = useMediaQuery(createMinWidthQuery("md"));
  const content = <ActiveRentalPage embedded={isDesktop} />;

  return isDesktop ? <DashboardLayout>{content}</DashboardLayout> : content;
};

export default RentalPage;
