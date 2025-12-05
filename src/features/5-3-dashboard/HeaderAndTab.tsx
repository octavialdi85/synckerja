import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, User } from "lucide-react";

const tabs = [
  {
    key: "dashboard",
    path: "/operations/consultant/dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "leads-management",
    path: "/operations/consultant/leads-management",
    title: "Leads Management",
    icon: Users,
  },
  {
    key: "sales-consultant",
    path: "/operations/consultant/sales-consultant",
    title: "Sales Consultant",
    icon: User,
  },
];

export const HeaderAndTab = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeKey = useMemo(() => {
    // Check for exact match first, then check if pathname starts with tab path
    if (location.pathname === "/operations/consultant/leads-management") {
      return "leads-management";
    }
    const match = tabs.find((tab) => location.pathname.startsWith(tab.path));
    return match?.key ?? "leads-management";
  }, [location.pathname]);

  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">CRM</h1>
        <p className="text-xs text-gray-600">Manage leads and sales consultant activities</p>
      </div>

      {/* Tabs Section */}
      <div className="-mb-3">
        <nav className="flex space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeKey === tab.key;
            
            return (
              <div
                key={tab.key}
                onClick={() => navigate(tab.path)}
                className={`flex items-center space-x-1.5 py-1.5 px-1 border-b-2 font-medium text-sm cursor-pointer transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.title}</span>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default HeaderAndTab;

