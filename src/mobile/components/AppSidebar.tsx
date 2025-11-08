
import { Clock, CreditCard, Home, UserCheck } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/mobile/components/ui/sidebar";
import { Separator } from "@/mobile/components/ui/separator";

const menuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Subscription", url: "/subscription/overview", icon: CreditCard },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const sectionLabel = currentPath.startsWith("/subscription") ? "Subscription" : "Home";

  return (
    <Sidebar
      className="border-r border-primary/20 bg-background"
    >
      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-foreground font-semibold px-4 py-3">
            <Clock className="h-5 w-5 text-primary" />
            <span className="text-foreground">ProfitLoop</span>
          </SidebarGroupLabel>
          
          <Separator className="bg-primary/20 mx-4 mb-2" />
          
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item, index) => (
                <div key={item.title}>
                  <SidebarMenuItem>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        [
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg w-full transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                            : "text-foreground hover:bg-primary/10",
                        ].join(" ")
                      }
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="font-medium">{item.title}</span>
                    </NavLink>
                  </SidebarMenuItem>
                  {index < menuItems.length - 1 && (
                    <Separator className="bg-border/50 mx-2 my-1" />
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
