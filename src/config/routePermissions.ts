/**
 * Centralized Route Permission Configuration
 * 
 * This file documents and manages the permission configuration for all routes
 * in the application. It serves as a reference for understanding which routes
 * are protected and how they're configured.
 */

export interface RoutePermissionConfig {
  path: string;
  requiresAuth: boolean;
  requiresPermissions: boolean;
  permissionPath?: string; // Custom path for permission checking (if different from route path)
  description: string;
  defaultRoles?: string[]; // Expected default roles for this route
  notes?: string;
}

/**
 * Route permission configurations used throughout the application
 * This serves as documentation and can be used for automated testing
 */
export const ROUTE_PERMISSIONS: RoutePermissionConfig[] = [
  // Public Routes (no authentication required)
  {
    path: '/login',
    requiresAuth: false,
    requiresPermissions: false,
    description: 'Login page - only accessible when not authenticated'
  },
  {
    path: '/register',
    requiresAuth: false,
    requiresPermissions: false,
    description: 'Registration page - only accessible when not authenticated'
  },
  {
    path: '/verify-email',
    requiresAuth: false,
    requiresPermissions: false,
    description: 'Email verification page'
  },
  {
    path: '/email-verified',
    requiresAuth: false,
    requiresPermissions: false,
    description: 'Email verification confirmation page'
  },
  {
    path: '/terms-and-conditions',
    requiresAuth: false,
    requiresPermissions: false,
    description: 'Terms and conditions page - publicly accessible'
  },

  // Basic Authenticated Routes (no special permissions required)
  {
    path: '/',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Home page - accessible to all authenticated users'
  },
  {
    path: '/create-organization',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Organization creation - has its own access logic'
  },
  {
    path: '/create-plan',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Plan creation - has its own access logic'
  },
  {
    path: '/employee-welcome',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Employee welcome page - accessible to new employees'
  },
  {
    path: '/first-login',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'First login setup - accessible to new employees'
  },

  // General Tools (accessible to all authenticated users)
  {
    path: '/password-manager',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Password manager - accessible to all authenticated users'
  },
  {
    path: '/daily-task',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Daily task management - accessible to all authenticated users'
  },
  {
    path: '/tools/daily-task',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Daily task management (alternative path) - accessible to all authenticated users'
  },
  {
    path: '/tools/meeting-notes',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Meeting notes - accessible to all authenticated users'
  },

  // Employee Self-Service (accessible to all authenticated users)
  {
    path: '/my-info/personal',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Employee personal information - accessible to all authenticated users'
  },
  {
    path: '/my-info/address',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Employee address information - accessible to all authenticated users'
  },
  {
    path: '/my-info/employment',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Employee employment information - accessible to all authenticated users'
  },
  {
    path: '/my-info/education/formal',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Employee formal education - accessible to all authenticated users'
  },
  {
    path: '/my-info/education/informal',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Employee informal education - accessible to all authenticated users'
  },
  {
    path: '/my-info/work',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Employee work experience - accessible to all authenticated users'
  },
  {
    path: '/my-info/family',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Employee family information - accessible to all authenticated users'
  },
  {
    path: '/my-info/attendance',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Employee attendance records - accessible to all authenticated users'
  },
  {
    path: '/my-info/leave-permit',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Employee leave permits - accessible to all authenticated users'
  },
  {
    path: '/my-info/documents',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Employee documents - accessible to all authenticated users'
  },
  {
    path: '/my-info/payroll',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Employee payroll information - accessible to all authenticated users'
  },

  // Permission-Protected Routes (require specific role-based permissions)
  {
    path: '/subscription',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/subscription',
    description: 'Subscription overview - requires owner permissions',
    defaultRoles: ['owner'],
    notes: 'Maps to /subscription permission configuration'
  },
  {
    path: '/subscription/overview',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/subscription',
    description: 'Subscription overview - requires owner permissions',
    defaultRoles: ['owner'],
    notes: 'Maps to /subscription permission configuration'
  },
  {
    path: '/subscription/plans',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/subscription',
    description: 'Subscription plans - requires owner permissions',
    defaultRoles: ['owner'],
    notes: 'Maps to /subscription permission configuration'
  },
  {
    path: '/subscription/management',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/subscription',
    description: 'Subscription management - requires owner permissions',
    defaultRoles: ['owner'],
    notes: 'Maps to /subscription permission configuration'
  },
  {
    path: '/employees',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/employee-management',
    description: 'Employee list - requires admin/owner permissions',
    defaultRoles: ['owner', 'admin'],
    notes: 'Maps to /employee-management permission configuration'
  },
  {
    path: '/employees/add',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/employee-management',
    description: 'Add employee - requires admin/owner permissions',
    defaultRoles: ['owner', 'admin'],
    notes: 'Maps to /employee-management permission configuration'
  },
  {
    path: '/attendance',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/attendance-management',
    description: 'Attendance dashboard - requires admin/owner permissions',
    defaultRoles: ['owner', 'admin'],
    notes: 'Maps to /attendance-management permission configuration'
  },
  {
    path: '/attendance/attendance',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/attendance-management',
    description: 'Attendance records - requires admin/owner permissions',
    defaultRoles: ['owner', 'admin'],
    notes: 'Maps to /attendance-management permission configuration'
  },
  {
    path: '/attendance/settings',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/attendance-management',
    description: 'Attendance settings - requires admin/owner permissions',
    defaultRoles: ['owner', 'admin'],
    notes: 'Maps to /attendance-management permission configuration'
  },
  {
    path: '/access-permissions/page-access',
    requiresAuth: true,
    requiresPermissions: false,
    description: 'Page access configuration - permissions determined by database configuration only (no hardcoded restrictions)',
    defaultRoles: ['owner', 'admin', 'employee', 'hr']  // All roles can access if no DB restrictions
  },
  {
    path: '/dashboard',
    requiresAuth: true,
    requiresPermissions: true,
    description: 'Dashboard - role-based access',
    defaultRoles: ['owner', 'admin', 'employee']
  },
  {
    path: '/admin',
    requiresAuth: true,
    requiresPermissions: true,
    description: 'Admin panel - requires owner permissions',
    defaultRoles: ['owner']
  },
  {
    path: '/admin/settings',
    requiresAuth: true,
    requiresPermissions: true,
    description: 'Admin settings - requires owner permissions',
    defaultRoles: ['owner']
  },
  {
    path: '/admin/users',
    requiresAuth: true,
    requiresPermissions: true,
    description: 'Admin users management - requires owner permissions',
    defaultRoles: ['owner']
  },
  {
    path: '/users/permissions',
    requiresAuth: true,
    requiresPermissions: true,
    description: 'User permissions management - requires owner permissions',
    defaultRoles: ['owner']
  },
  {
    path: '/users/roles',
    requiresAuth: true,
    requiresPermissions: true,
    description: 'User roles management - requires owner permissions',
    defaultRoles: ['owner']
  },
  {
    path: '/recruitment',
    requiresAuth: true,
    requiresPermissions: true,
    description: 'Recruitment management - requires admin/owner permissions',
    defaultRoles: ['owner', 'admin'],
    notes: 'Has exception path: /recruitment/interviewees'
  },
  {
    path: '/recruitment/interviewees',
    requiresAuth: true,
    requiresPermissions: true,
    description: 'Interviewees management - requires admin/owner permissions',
    defaultRoles: ['owner', 'admin']
  },
  {
    path: '/access-permissions/pages',
    requiresAuth: true,
    requiresPermissions: true,
    description: 'Access permissions pages management - requires owner permissions',
    defaultRoles: ['owner']
  },
  {
    path: '/access-permissions/roles',
    requiresAuth: true,
    requiresPermissions: true,
    description: 'Access permissions roles management - requires owner permissions',
    defaultRoles: ['owner']
  },
  {
    path: '/access-permissions/users',
    requiresAuth: true,
    requiresPermissions: true,
    description: 'Access permissions users management - requires owner permissions',
    defaultRoles: ['owner']
  },
  {
    path: '/digital-marketing/social-media',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/digital-marketing',
    description: 'Social media dashboard - role-based access',
    notes: 'Maps to /digital-marketing permission configuration'
  },
  {
    path: '/digital-marketing/social-media/dashboard',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/digital-marketing',
    description: 'Social media dashboard - role-based access',
    notes: 'Maps to /digital-marketing permission configuration'
  },
  {
    path: '/digital-marketing/social-media/content-calendar',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/digital-marketing',
    description: 'Content calendar - role-based access',
    notes: 'Maps to /digital-marketing permission configuration'
  },
  {
    path: '/digital-marketing/social-media/settings',
    requiresAuth: true,
    requiresPermissions: true,
    permissionPath: '/digital-marketing',
    description: 'Digital marketing settings - role-based access',
    notes: 'Maps to /digital-marketing permission configuration'
  }
];

/**
 * Get permission configuration for a specific route
 */
export const getRoutePermissionConfig = (path: string): RoutePermissionConfig | undefined => {
  return ROUTE_PERMISSIONS.find(config => config.path === path);
};

/**
 * Get all routes that require specific permissions
 */
export const getPermissionProtectedRoutes = (): RoutePermissionConfig[] => {
  return ROUTE_PERMISSIONS.filter(config => config.requiresPermissions);
};

/**
 * Get all routes that are publicly accessible
 */
export const getPublicRoutes = (): RoutePermissionConfig[] => {
  return ROUTE_PERMISSIONS.filter(config => !config.requiresAuth);
};

/**
 * Get all routes that require authentication but not specific permissions
 */
export const getBasicAuthRoutes = (): RoutePermissionConfig[] => {
  return ROUTE_PERMISSIONS.filter(config => config.requiresAuth && !config.requiresPermissions);
};

/**
 * Expected default permission configurations based on route analysis
 * This matches the SQL migration default configurations
 */
export const EXPECTED_DEFAULT_PERMISSION_CONFIGURATIONS = [
  {
    page_path: '/dashboard',
    page_title: 'Dashboard',
    roles_allowed: ['owner', 'admin', 'employee'],
    description: 'Main dashboard - accessible to all roles'
  },
  {
    page_path: '/employee-management',
    page_title: 'Employee Management',
    roles_allowed: ['owner', 'admin'],
    description: 'Employee management features'
  },
  {
    page_path: '/recruitment',
    page_title: 'Recruitment',
    roles_allowed: ['owner', 'admin'],
    exception_paths: ['/recruitment/interviewees'],
    description: 'Recruitment features with specific exceptions'
  },
  {
    page_path: '/access-permissions',
    page_title: 'Access Permissions',
    roles_allowed: ['owner'],
    description: 'Permission configuration - owner only'
  },
  {
    page_path: '/subscription',
    page_title: 'Subscription Management',
    roles_allowed: ['owner'],
    description: 'Subscription management - owner only'
  },
  {
    page_path: '/digital-marketing',
    page_title: 'Digital Marketing',
    roles_allowed: ['owner', 'admin', 'employee'],
    description: 'Digital marketing tools - configurable access'
  }
];
