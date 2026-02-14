import { Home, Calendar, BarChart3, User, MapPin } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePrefetchHomeData } from "@/hooks/useParallelHomeData";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Calendar, label: "Schedule", path: "/schedule" },
  { icon: MapPin, label: "Client Visit", path: "/client-visit" },
  { icon: BarChart3, label: "Reports", path: "/reports" },
  { icon: User, label: "Profile", path: "/profile" }
];

export const NavigationFooter = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const prefetchHomeData = usePrefetchHomeData();

  const handleNavClick = (path: string) => {
    if (path === "/") {
      prefetchHomeData().catch(() => {});
    }
    navigate(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;

          return (
            <button
              key={path}
              onClick={() => handleNavClick(path)}
              className={`flex flex-col items-center py-2 px-1 transition-colors ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};