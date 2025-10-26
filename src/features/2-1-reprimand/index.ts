/**
 * Reprimand Management Module
 * 
 * This module provides comprehensive reprimand/disciplinary action management
 * for tracking employee violations and corrective actions.
 * 
 * Single file implementation for simplicity and maintainability.
 */

// Main export
export { ReprimandManagementPage } from './ReprimandManagementPage';

// Component exports
export { HeaderAndTab } from './HeaderAndTab';
export { AddReprimandDialog } from './AddReprimandDialog';
export { default as ReprimandDepartmentCard } from './ReprimandDepartmentCard';
export { default as ReprimandTableFooter } from './ReprimandTableFooter';
export { default as ReprimandViewDropdown } from './ReprimandViewDropdown';

// Hook exports
export { useReprimands, useCreateReprimand } from './hooks/useReprimands';
export { useEmployees } from './hooks/useEmployees';