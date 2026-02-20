import { CheckSquare, ClipboardList, FileBarChart, NotebookPen, Target } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: CheckSquare, label: "Daily Task", path: "/tools/daily-task" },
  { icon: Target, label: "Initiative", path: "/tools/daily-task?view=initiative" },
  { icon: ClipboardList, label: "Job Desc", path: "/tools/daily-task?view=jobdesc" },
  { icon: FileBarChart, label: "Report", path: "/tools/daily-task-report" },
  { icon: NotebookPen, label: "Notes", path: "/tools/meeting-notes" },
];

interface ToolsNavigationFooterProps {
  /** Optional class to e.g. use safe-area-bottom-lower for consistency with other mobile pages */
  className?: string;
}

export const ToolsNavigationFooter = ({ className }: ToolsNavigationFooterProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 bg-card border-t border-border z-30"
    >
      <div className={`grid grid-cols-5 max-w-md mx-auto ${className ? className : "safe-area-padding-bottom"}`.trim()}>
        {navItems.map(({ icon: Icon, label, path }) => {
          // Check if current path matches
          let isActive = false;
          
          if (label === "Initiative") {
            isActive = location.pathname === "/tools/daily-task" && new URLSearchParams(location.search).get('view') === 'initiative';
          } else if (label === "Job Desc") {
            isActive = location.pathname === "/tools/daily-task" && new URLSearchParams(location.search).get('view') === 'jobdesc';
          } else if (label === "Daily Task") {
            const view = new URLSearchParams(location.search).get('view');
            isActive = location.pathname === "/tools/daily-task" && view !== 'initiative' && view !== 'jobdesc';
          } else {
            // For other items, check if pathname matches
            isActive = location.pathname === path;
          }

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





