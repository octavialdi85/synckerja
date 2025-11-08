
import React from "react";
import { Home, Wrench, Megaphone, CreditCard, Users, Target } from "lucide-react";

export const menuItems: MenuItem[] = [
  {
    title: "Home",
    icon: Home,
    url: "/",
    hasSubSidebar: false,
  },
  {
    title: "OKR",
    icon: Target,
    url: "/okr/company-objective",
    hasSubSidebar: false,
  },
  {
    title: "Human Resources",
    icon: Users,
    url: "#",
    hasSubSidebar: true,
    subSidebarItems: [
      {
        title: "Employees",
        url: "/employees",
        description: "Manage employee information and records"
      },
      {
        title: "Attendance",
        url: "/attendance",
        description: "Manage employee attendance, analytics, and settings"
      },
      {
        title: "Page Access",
        url: "/access-permissions/page-access",
        description: "Manage user access permissions and page restrictions"
      }
    ]
  },
  {
    title: "Digital Marketing",
    icon: Megaphone,
    url: "#",
    hasSubSidebar: true,
    subSidebarItems: [
      {
        title: "Social Media Management",
        url: "/digital-marketing/social-media",
        description: "Manage and analyze social media performance"
      }
    ]
  },
  {
    title: "Tools",
    icon: Wrench,
    url: "#",
    hasSubSidebar: true,
    subSidebarItems: [
      {
        title: "Password Manager",
        url: "/password-manager",
        description: "Manage your passwords securely"
      },
      {
        title: "Daily Task",
        url: "/tools/daily-task",
        description: "Manage your daily tasks and productivity"
      }
    ]
  },
  {
    title: "Subscription",
    icon: CreditCard,
    url: "/subscription",
    hasSubSidebar: false,
  },
];

export interface MenuItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  hasSubSidebar?: boolean;
  subSidebarItems?: SubMenuItem[];
}

export interface SubMenuItem {
  title: string;
  url: string;
  description: string;
}

