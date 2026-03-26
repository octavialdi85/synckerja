# Employees Status Runtime Audit

This document tracks runtime references that previously depended on `employees.status` and their replacement strategy.

## Refactored in this phase

- `src/features/share/hooks/useAvailableEmployees.ts`
  - **Before:** selected `status` and filtered with `status.eq.active/status.is.null`.
  - **After:** select `employee_status_id`, resolve `employee_status_name` from `employee_statuses`, filter via `isEmployeeActive()`.

- `src/features/2-1-employees/hooks/useAddEmployeeForm.ts`
  - **Before:** form default used `status: 'active'`.
  - **After:** form uses `employee_status_id` as canonical field.

- `src/features/2-1-employees/hooks/useEmployeeValidation.ts`
  - **Before:** employment validation required `formData.status`.
  - **After:** employment validation requires `formData.employee_status_id`.

- `src/features/2-1-employees/add-employee/sections/EmploymentDetailsSection.tsx`
  - **Before:** Employee Status dropdown bound to `formData.status`.
  - **After:** dropdown bound to `formData.employee_status_id`.

- `src/features/2-1-employees/add-employee/useEmployeeDataBuilder.ts`
  - **Before:** populated `employee_status_id` from `formData.status`.
  - **After:** canonical source is `formData.employee_status_id` (legacy fallback retained for compatibility).

- `src/features/2-1-employees/hooks/useEmployees.ts`
  - **Before:** `employee_status_name` fallback could use `employees.status`.
  - **After:** `employee_status_name` is resolved from relation only; source tagged as `employee_status_source`.

- `src/features/1_home/components/HomeOKRDashboard/component/SectionQuickMenuImport/useEmployeeAttendanceStats.ts`
  - **Before:** used relation filter `.eq('employees.status', 'active')` and employees query `.eq('status','active')`.
  - **After:** resolves active employees via `employee_status_id -> employee_statuses.name` and filters by `employee_id`.

- `src/features/8-2-DailyTask/section/JobDescTracker/useJobDescAssignments.ts`
  - **Before:** selected `status` and used fallback on `employees.status`.
  - **After:** removed direct `status` usage; classify active via `employee_statuses` relation map.

- `src/mobile/pages/job-desc/section/useJobDescAssignments.ts`
  - **Before:** selected `status` and used fallback on `employees.status`.
  - **After:** removed direct `status` usage; classify active via `employee_statuses` relation map.

- `src/features/6-1-ScriptGenerator/components/SaveToPlanModal.tsx`
  - **Before:** fetched employees with `.eq('status', 'active')`.
  - **After:** fetches `employee_status_id`, resolves status names, filters active with `isEmployeeActive()`.

- `src/features/2-7-payroll/components/overview/PayrollRunsOverview.tsx`
  - **Before:** debug helper query filtered employees by `status`.
  - **After:** removed direct `status` filter/select.

## Still allowed during deprecation window

- Legacy comments/docs may still mention `employees.status` for historical context.
- Database migration/index references remain until drop migration is executed.
