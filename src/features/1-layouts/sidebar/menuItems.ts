
import React from "react";
import { Home, Wrench, Megaphone, CreditCard, Users, Target, Briefcase, DollarSign, ClipboardList } from "lucide-react";

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
        title: "Recruitment",
        titleKey: "sidebar.humanResources.recruitment.title",
        url: "/recruitment",
        description: "Manage recruitment dashboard and job openings",
        descriptionKey: "sidebar.humanResources.recruitment.description",
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
    title: "Finance",
    titleKey: "sidebar.finance.title",
    icon: DollarSign,
    url: "#",
    hasSubSidebar: true,
    subSidebarItems: [
      {
        title: "Incomes",
        titleKey: "sidebar.finance.incomes.title",
        url: "/incomes/dashboard",
        description: "Manage and track income transactions",
        descriptionKey: "sidebar.finance.incomes.description",
      },
      {
        title: "Expenses",
        titleKey: "sidebar.finance.expenses.title",
        url: "/expenses/dashboard",
        description: "Manage and track expense transactions",
        descriptionKey: "sidebar.finance.expenses.description",
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
      {
        title: "KOL Management",
        titleKey: "sidebar.digitalMarketing.kolManagement.title",
        url: "/kol-management/dashboard",
        description: "Manage KOL profiles, campaigns, and content posts",
        descriptionKey: "sidebar.digitalMarketing.kolManagement.description",
      },
    ],
  },
  {
    title: "Operations",
    titleKey: "sidebar.operations.title",
    icon: Briefcase,
    url: "#",
    hasSubSidebar: true,
    subSidebarItems: [
      {
        title: "Customer Service",
        titleKey: "sidebar.operations.customerService.title",
        url: "/operations/customer-service",
        description: "Manage customer service tickets and support",
        descriptionKey: "sidebar.operations.customerService.description",
      },
      {
        title: "Sales",
        titleKey: "sidebar.operations.sales.title",
        url: "/operations/sales/activities",
        description: "Manage sales activities and transactions",
        descriptionKey: "sidebar.operations.sales.description",
      },
      {
        title: "CRM",
        titleKey: "sidebar.operations.crm.title",
        url: "/operations/consultant/leads-management",
        description: "Manage CRM leads and consultant activities",
        descriptionKey: "sidebar.operations.crm.description",
      },
      {
        title: "Account Connect",
        titleKey: "sidebar.operations.whatsappConnect.title",
        url: "/operations/consultant/whatsapp/connect",
        description: "Configure WhatsApp Business API",
        descriptionKey: "sidebar.operations.whatsappConnect.description",
      },
      {
        title: "Connect Instagram",
        titleKey: "sidebar.operations.instagramConnect.title",
        url: "/operations/consultant/instagram/connect",
        description: "Connect Instagram Business Account",
        descriptionKey: "sidebar.operations.instagramConnect.description",
      },
      {
        title: "Livechat",
        titleKey: "sidebar.operations.livechat.title",
        url: "/operations/consultant/all/livechat",
        description: "WhatsApp inbox and conversations",
        descriptionKey: "sidebar.operations.livechat.description",
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
        title: "Calculator",
        titleKey: "sidebar.tools.calculator.title",
        url: "/tools/calculator/services",
        description: "General purpose calculator tools",
        descriptionKey: "sidebar.tools.calculator.description",
      },
      {
        title: "PPh 21 Calculator",
        titleKey: "sidebar.tools.pph21Calculator.title",
        url: "/tools/pph21-calculator",
        description: "Calculate Indonesian payroll tax automatically",
        descriptionKey: "sidebar.tools.pph21Calculator.description",
      },
      {
        title: "Pricing Tool",
        titleKey: "sidebar.tools.pricingTools.title",
        url: "/tools/pricing-tools",
        description: "Analyze pricing scenarios and profitability",
        descriptionKey: "sidebar.tools.pricingTools.description",
      },
    ],
  },
  {
    title: "Request Form",
    titleKey: "sidebar.requestForm.title",
    icon: ClipboardList,
    url: "/request-form/purchase",
    hasSubSidebar: false,
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

