import { useState, useEffect, useMemo } from 'react';
import { Checkbox } from '@/features/ui/checkbox';
import { Button } from '@/features/ui/button';
import { useActiveEmployeesForRemoval, useMarkEmployeesForRemoval, useUnmarkEmployeesForRemoval, EmployeeForRemoval } from '../hooks/usePendingRemovalEmployees';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { AlertCircle, Users, UserX } from 'lucide-react';

interface EmployeeRemovalSelectorProps {
  currentEmployeeCount: number;
  newMemberCount: number;
  onSelectionChange?: (selectedCount: number, requiredCount: number) => void;
}

export const EmployeeRemovalSelector = ({
  currentEmployeeCount,
  newMemberCount,
  onSelectionChange,
}: EmployeeRemovalSelectorProps) => {
  const { t } = useAppTranslation();
  const { data: employees = [], isLoading } = useActiveEmployeesForRemoval();
  const markForRemoval = useMarkEmployeesForRemoval();
  const unmarkForRemoval = useUnmarkEmployeesForRemoval();

  // Use actual employee count from fetched employees if currentEmployeeCount is 0 or less
  // This ensures we use the most accurate count
  // If we have employees data, use that length; otherwise use currentEmployeeCount prop
  const actualEmployeeCount = employees.length > 0 ? employees.length : (currentEmployeeCount > 0 ? currentEmployeeCount : 0);
  
  // Calculate required removals
  const requiredRemovals = Math.max(0, actualEmployeeCount - newMemberCount);
  const needsRemoval = actualEmployeeCount > newMemberCount;

  // Debug logging
  console.log('🔍 EmployeeRemovalSelector Debug:', {
    propCurrentEmployeeCount: currentEmployeeCount,
    actualEmployeeCount,
    employeesLength: employees.length,
    newMemberCount,
    requiredRemovals,
    needsRemoval,
    isLoading
  });

  // State untuk selected employees
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<string>>(new Set());

  // Load existing pending_removal employees
  useEffect(() => {
    const pendingIds = employees
      .filter(emp => emp.pending_removal)
      .map(emp => emp.id);
    setSelectedEmployeeIds(new Set(pendingIds));
  }, [employees]);

  // Calculate selected count and notify parent
  const selectedCount = selectedEmployeeIds.size;
  useEffect(() => {
    onSelectionChange?.(selectedCount, requiredRemovals);
  }, [selectedCount, requiredRemovals, onSelectionChange]);

  const handleToggleEmployee = async (employeeId: string, currentlySelected: boolean) => {
    console.log('🔍 handleToggleEmployee called:', { employeeId, currentlySelected, selectedCount, requiredRemovals });
    
    const newSelected = new Set(selectedEmployeeIds);
    
    if (currentlySelected) {
      // Unmark employee
      console.log('🔍 Unmarking employee:', employeeId);
      newSelected.delete(employeeId);
      setSelectedEmployeeIds(newSelected);
      try {
        await unmarkForRemoval.mutateAsync({ employeeIds: [employeeId] });
        console.log('✅ Successfully unmarked employee:', employeeId);
      } catch (error) {
        console.error('❌ Error unmarking employee:', error);
        // Revert state on error
        setSelectedEmployeeIds(prev => new Set([...prev, employeeId]));
      }
    } else {
      // Check if we've reached the limit
      if (selectedCount >= requiredRemovals) {
        console.log('⚠️ Reached removal limit, cannot select more');
        // Don't allow selecting more than required
        return;
      }
      // Mark employee
      console.log('🔍 Marking employee for removal:', employeeId);
      newSelected.add(employeeId);
      setSelectedEmployeeIds(newSelected);
      try {
        const result = await markForRemoval.mutateAsync({ 
          employeeIds: [employeeId],
          reason: 'Subscription downgrade'
        });
        console.log('✅ Successfully marked employee for removal:', employeeId, result);
      } catch (error) {
        console.error('❌ Error marking employee for removal:', error);
        // Revert state on error
        setSelectedEmployeeIds(prev => {
          const reverted = new Set(prev);
          reverted.delete(employeeId);
          return reverted;
        });
      }
    }
  };

  const isSelectionComplete = selectedCount >= requiredRemovals;
  const canSelectMore = selectedCount < requiredRemovals;

  // Filter employees - show all active employees (we'll show pending_removal status but allow selection)
  const availableEmployees = useMemo(() => {
    // Filter to only active employees
    const activeEmployees = employees.filter(emp => {
      return emp.status === 'active' || emp.status === null;
    });
    
    // Sort by name
    const sorted = activeEmployees.sort((a, b) => {
      const nameA = a.full_name || '';
      const nameB = b.full_name || '';
      return nameA.localeCompare(nameB);
    });
    
    console.log('🔍 Available Employees:', {
      totalEmployees: employees.length,
      activeEmployeesCount: activeEmployees.length,
      availableEmployeesCount: sorted.length,
      employees: employees.map(e => ({ id: e.id, name: e.full_name, status: e.status, pending_removal: e.pending_removal }))
    });
    
    return sorted;
  }, [employees]);

  // Show loading state if employees data is still loading
  if (isLoading) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-700">
          {t('subscription.employeeRemoval.loading', 'Loading employees...')}
        </p>
      </div>
    );
  }

  // If we don't need removal (actualEmployeeCount <= newMemberCount), don't show
  if (!needsRemoval) {
    console.log('🔍 EmployeeRemovalSelector: No removal needed', {
      actualEmployeeCount,
      newMemberCount,
      requiredRemovals
    });
    return null;
  }

  return (
    <div className="bg-red-50 p-4 rounded-lg border border-red-200 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-800 mb-1">
            {t('subscription.employeeRemoval.title', 'Employee Removal Required')}
          </h4>
          <p className="text-sm text-red-700">
            {t('subscription.employeeRemoval.description', 
              'You need to remove {{required}} employee(s) to proceed with this downgrade. Please select which employees to remove.',
              { required: String(requiredRemovals) }
            )}
          </p>
        </div>
      </div>

      {/* Selection Status */}
      <div className="bg-white p-3 rounded border border-red-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-red-600" />
            <span className="text-gray-700">
              {t('subscription.employeeRemoval.currentEmployees', 'Current Employees:')}
            </span>
            <span className="font-medium">{actualEmployeeCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserX className="w-4 h-4 text-red-600" />
            <span className="text-gray-700">
              {t('subscription.employeeRemoval.newLimit', 'New Limit:')}
            </span>
            <span className="font-medium">{newMemberCount}</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-800">
              {t('subscription.employeeRemoval.selectedCount', 'Selected for Removal:')}
            </span>
            <span className={`text-sm font-bold ${isSelectionComplete ? 'text-green-600' : 'text-red-600'}`}>
              {selectedCount} / {requiredRemovals}
            </span>
          </div>
          {!isSelectionComplete && (
            <p className="text-xs text-red-600 mt-1">
              {t('subscription.employeeRemoval.selectMore', 
                'Please select {{remaining}} more employee(s)',
                { remaining: String(requiredRemovals - selectedCount) }
              )}
            </p>
          )}
        </div>
      </div>

      {/* Employee List */}
      <div className="space-y-2 max-h-60 overflow-y-auto seamless-scroll">
        <p className="text-xs font-medium text-red-700 mb-2">
          {t('subscription.employeeRemoval.selectEmployees', 'Select employees to remove:')}
        </p>
        {availableEmployees.length > 0 ? (
          availableEmployees.map((employee) => {
            const isSelected = selectedEmployeeIds.has(employee.id);
            const isDisabled = !isSelected && !canSelectMore;

            return (
              <div
                key={employee.id}
                className={`flex items-center gap-3 p-2 rounded border transition-colors ${
                  isSelected
                    ? 'bg-red-100 border-red-300'
                    : isDisabled
                    ? 'bg-gray-50 border-gray-200 opacity-50'
                    : 'bg-white border-gray-200 hover:border-red-300'
                }`}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggleEmployee(employee.id, isSelected)}
                  disabled={isDisabled || markForRemoval.isPending || unmarkForRemoval.isPending}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isSelected ? 'text-red-900' : 'text-gray-900'}`}>
                    {employee.full_name}
                  </p>
                  <p className={`text-xs ${isSelected ? 'text-red-700' : 'text-gray-500'}`}>
                    {employee.email}
                  </p>
                </div>
                {isSelected && (
                  <span className="text-xs bg-red-600 text-white px-2 py-1 rounded">
                    {t('subscription.employeeRemoval.willBeRemoved', 'Will be removed')}
                  </span>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center text-gray-500 py-4">
            <p className="text-sm">
              {t('subscription.employeeRemoval.noEmployees', 'No active employees found.')}
            </p>
          </div>
        )}
      </div>

      {/* Warning Message */}
      {isSelectionComplete && (
        <div className="bg-green-100 border border-green-300 rounded p-2">
          <p className="text-xs text-green-800 font-medium">
            ✅ {t('subscription.employeeRemoval.selectionComplete', 
              'Selection complete! You can now proceed with the payment.'
            )}
          </p>
        </div>
      )}
    </div>
  );
};

