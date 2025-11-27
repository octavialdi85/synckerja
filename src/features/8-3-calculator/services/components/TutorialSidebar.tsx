import { CalculatorTutorial } from "./CalculatorTutorial";
import CalculatorSidebarFooter from "./CalculatorSidebarFooter";

interface TutorialSidebarProps {
  activeTab: "services" | "sales";
}

export const TutorialSidebar = ({ activeTab }: TutorialSidebarProps) => {
  return (
    <div className="col-span-3 h-full min-h-0">
      <div className="h-full bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll max-h-[calc(100vh-120px)] px-6 py-6">
          <CalculatorTutorial currentTab={activeTab} />
        </div>
        <CalculatorSidebarFooter />
      </div>
    </div>
  );
};

