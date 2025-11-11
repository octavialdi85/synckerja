import { CheckSquare, FileBarChart, NotebookPen } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: CheckSquare, label: "Daily Task", path: "/tools/daily-task" },
  { icon: FileBarChart, label: "Daily Task Report", path: "/tools/daily-task-report" },
  { icon: NotebookPen, label: "Meeting Notes", path: "/tools/meeting-notes" },
];

export const ToolsNavigationFooter = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="grid grid-cols-3 max-w-md mx-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname === path;

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center py-2 px-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium text-center leading-tight">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};




