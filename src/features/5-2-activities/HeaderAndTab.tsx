import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Activity, Calendar, Users } from "lucide-react";

const tabs = [
  {
    key: "activities",
    path: "/operations/sales/activities",
    title: "Activities",
    icon: Activity,
  },
  {
    key: "jadwal-kunjungan",
    path: "/operations/sales/jadwal-kunjungan",
    title: "Jadwal Kunjungan",
    icon: Calendar,
  },
  {
    key: "client-visits",
    path: "/operations/sales/client-visits",
    title: "Client Visits",
    icon: Users,
  },
];

export const HeaderAndTab = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeKey = useMemo(() => {
    const match = tabs.find((tab) => location.pathname.startsWith(tab.path));
    return match?.key ?? "activities";
  }, [location.pathname]);

  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">Sales Operations</h1>
        <p className="text-xs text-gray-600">Manage sales activities and client interactions</p>
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

