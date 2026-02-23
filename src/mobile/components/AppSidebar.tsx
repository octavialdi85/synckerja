import { useState } from "react";
import { Clock, CreditCard, Home, MessageCircle } from "lucide-react";
import { NavLink } from "react-router-dom";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/mobile/components/ui/sidebar";
import { Separator } from "@/mobile/components/ui/separator";
import { useIsMobile } from "@/mobile/hooks/use-mobile";
import { useOrganizationList } from "@/mobile/hooks/useOrganizationList";
import { useOrganizationSwitchCallback } from "@/mobile/hooks/useOrganizationSwitchCallback";
import { OrganizationSelectDrawer } from "@/mobile/components/OrganizationSelectDrawer";

const menuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Live Chat", url: "/operations/consultant/all/livechat", icon: MessageCircle },
  { title: "Daily Task", url: "/tools/daily-task", icon: Clock },
  { title: "Subscription", url: "/subscription/overview", icon: CreditCard },
];

export function AppSidebar() {
  const isMobile = useIsMobile();
  const { organizations, activeOrganization } = useOrganizationList();
  const onOrganizationSwitched = useOrganizationSwitchCallback();
  const [orgDrawerOpen, setOrgDrawerOpen] = useState(false);

  const canOpenOrgDrawer = isMobile && organizations.length > 1;
  const organizationDisplayName = activeOrganization?.company_name ?? "Organisasi";

  return (
    <Sidebar className="border-r border-primary/20 bg-background">
      <SidebarContent className="bg-background">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 text-foreground px-4 py-2">
            {isMobile ? (
              <>
                <span
                  role={canOpenOrgDrawer ? "button" : undefined}
                  tabIndex={canOpenOrgDrawer ? 0 : undefined}
                  onClick={canOpenOrgDrawer ? () => setOrgDrawerOpen(true) : undefined}
                  onKeyDown={
                    canOpenOrgDrawer
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOrgDrawerOpen(true);
                          }
                        }
                      : undefined
                  }
                  className={`text-sm font-medium text-foreground truncate ${canOpenOrgDrawer ? "cursor-pointer hover:opacity-80" : ""}`}
                >
                  {organizationDisplayName}
                </span>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="text-foreground">ProfitLoop</span>
              </>
            )}
          </SidebarGroupLabel>

          <Separator className="bg-primary/20 mx-4 mb-1.5" />

          <SidebarGroupContent className="px-2 pb-2">
            <SidebarMenu className="space-y-0.5">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <NavLink
                    to={item.url}
                    end
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-3 px-3 py-2 rounded-lg w-full transition-colors",
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
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {isMobile && (
        <OrganizationSelectDrawer
          open={orgDrawerOpen}
          onOpenChange={setOrgDrawerOpen}
          onSwitched={onOrganizationSwitched}
        />
      )}
    </Sidebar>
  );
}
