
import { Home, Calendar, BarChart3, User, Settings, Clock, UserCheck } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/mobile/components/ui/sidebar";
import { Separator } from "@/mobile/components/ui/separator";

const menuItems = [
  { title: "Attendance", url: "/absensi", icon: UserCheck },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

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
          
          {/* White rectangular background for Attendance */}
          <div className="mx-2 mb-2 bg-white rounded px-3 py-1.5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800">Home</h2>
          </div>
          
          <SidebarGroupContent className="px-2">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item, index) => (
                <div key={item.title}>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild className="w-full">
                      <NavLink 
                        to={item.url} 
                        end 
                        className={({ isActive }) => `
                          flex items-center gap-3 px-3 py-2.5 rounded-lg w-full hover:bg-transparent
                          ${isActive 
                            ? 'bg-primary text-primary-foreground font-medium shadow-sm' 
                            : 'text-foreground hover:text-foreground'
                          }
                        `}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="font-medium">{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
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
