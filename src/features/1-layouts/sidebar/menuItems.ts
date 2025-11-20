
import React from "react";
import { Home, Wrench, Megaphone, CreditCard, Users, Target } from "lucide-react";

export const menuItems: MenuItem[] = [
  {
    title: "Home",
    titleKey: "sidebar.home.title",
    icon: Home,
    url: "/",
    hasSubSidebar: false,
  },
  {
    title: "OKR",
    titleKey: "sidebar.okr.title",
    icon: Target,
    url: "/okr/company-objective",
    hasSubSidebar: false,
  },
  {
    title: "Human Resources",
    titleKey: "sidebar.humanResources.title",
    icon: Users,
    url: "#",
    hasSubSidebar: true,
    subSidebarItems: [
      {
        title: "Employees",
        titleKey: "sidebar.humanResources.employees.title",
        url: "/employees",
        description: "Manage employee information and records",
        descriptionKey: "sidebar.humanResources.employees.description",
      },
      {
        title: "Attendance",
        titleKey: "sidebar.humanResources.attendance.title",
        url: "/attendance",
        description: "Manage employee attendance, analytics, and settings",
        descriptionKey: "sidebar.humanResources.attendance.description",
      },
      {
        title: "Company",
        titleKey: "sidebar.humanResources.company.title",
        url: "/company/dashboard",
        description: "Manage company profile, departments, and assets",
        descriptionKey: "sidebar.humanResources.company.description",
      },
      {
        title: "Page Access",
        titleKey: "sidebar.humanResources.pageAccess.title",
        url: "/access-permissions/page-access",
        description: "Manage user access permissions and page restrictions",
        descriptionKey: "sidebar.humanResources.pageAccess.description",
      },
    ],
  },
  {
    title: "Digital Marketing",
    titleKey: "sidebar.digitalMarketing.title",
    icon: Megaphone,
    url: "#",
    hasSubSidebar: true,
    subSidebarItems: [
      {
        title: "Social Media Management",
        titleKey: "sidebar.digitalMarketing.socialMedia.title",
        url: "/digital-marketing/social-media",
        description: "Manage and analyze social media performance",
        descriptionKey: "sidebar.digitalMarketing.socialMedia.description",
      },
    ],
  },
  {
    title: "Tools",
    titleKey: "sidebar.tools.title",
    icon: Wrench,
    url: "#",
    hasSubSidebar: true,
    subSidebarItems: [
      {
        title: "Password Manager",
        titleKey: "sidebar.tools.passwordManager.title",
        url: "/password-manager",
        description: "Manage your passwords securely",
        descriptionKey: "sidebar.tools.passwordManager.description",
      },
      {
        title: "Daily Task",
        titleKey: "sidebar.tools.dailyTask.title",
        url: "/tools/daily-task",
        description: "Manage your daily tasks and productivity",
        descriptionKey: "sidebar.tools.dailyTask.description",
      },
      {
        title: "Campaign Calculator",
        titleKey: "sidebar.tools.campaignCalculator.title",
        url: "/tools/campaign-calculator",
        description: "Plan and analyze marketing campaign performance",
        descriptionKey: "sidebar.tools.campaignCalculator.description",
      },
    ],
  },
  {
    title: "Subscription",
    titleKey: "sidebar.subscription.title",
    icon: CreditCard,
    url: "/subscription",
    hasSubSidebar: false,
  },
];

export interface MenuItem {
  title: string;
  titleKey?: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  hasSubSidebar?: boolean;
  subSidebarItems?: SubMenuItem[];
}

export interface SubMenuItem {
  title: string;
  titleKey?: string;
  url: string;
  description: string;
  descriptionKey?: string;
}

