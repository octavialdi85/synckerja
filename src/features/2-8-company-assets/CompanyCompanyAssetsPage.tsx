import React, { useState, useEffect, useCallback } from 'react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from './HeaderAndTab';
import { AssetsFilters } from './AssetsFilters';
import { CompanyAssetsMetricsCards } from './CompanyAssetsMetricsCards';
import { AssetsTable } from './AssetsTable';
import { AddAssetModal } from './AddAssetModal';
import { CompanyAssetsOverviewFooter } from './CompanyAssetsOverviewFooter';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useShowToast } from '@/features/share/hooks/useShowToast';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export const CompanyCompanyAssetsPage = () => {
  const [activeTab, setActiveTab] = useState('company-assets');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedCondition, setSelectedCondition] = useState('All Conditions');
  const [selectedReceiptFilter, setSelectedReceiptFilter] = useState<string>('all');
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { t } = useAppTranslation();
  const { organizationId } = useCurrentOrg();
  const showToast = useShowToast();

  const fetchAssets = useCallback(async () => {
    if (!organizationId) return;

    setIsLoading(true);
    try {
      const { data: rawData, error } = await supabase
        .from('company_assets')
        .select(`
          *,
          purchase_requests(requester_name, department_name),
          employees!assigned_to_employee_id(full_name, department_id)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const employeeIds = (rawData || [])
        .map((r: any) => (Array.isArray(r.employees) ? r.employees[0]?.department_id : r.employees?.department_id))
        .filter(Boolean);
      const uniqueDeptIds = [...new Set(employeeIds)] as string[];
      let deptMap: Record<string, string> = {};
      if (uniqueDeptIds.length > 0) {
        const { data: depts } = await supabase.from('departments').select('id, name').in('id', uniqueDeptIds);
        deptMap = (depts || []).reduce((acc, d) => ({ ...acc, [d.id]: d.name }), {});
      }

      const data = (rawData || []).map((row: any) => {
        const pr = row.purchase_requests;
        const requester_name = Array.isArray(pr) ? pr[0]?.requester_name : pr?.requester_name;
        const department_name = Array.isArray(pr) ? pr[0]?.department_name : pr?.department_name;
        const emp = row.employees;
        const assigned_employee_name = Array.isArray(emp) ? emp[0]?.full_name : emp?.full_name;
        const assigned_department_id = Array.isArray(emp) ? emp[0]?.department_id : emp?.department_id;
        const assigned_department_name = assigned_department_id ? deptMap[assigned_department_id] ?? null : null;
        const { purchase_requests: _pr, employees: _emp, ...rest } = row;
        return {
          ...rest,
          requester_name: requester_name ?? null,
          department_name: department_name ?? null,
          assigned_employee_name: assigned_employee_name ?? null,
          assigned_department_name: assigned_department_name ?? null,
        };
      });
      setAssets(data);
    } catch (primaryError: any) {
      console.warn('Primary assets fetch failed, trying fallback without employees join:', primaryError?.message);
      try {
        const { data: rawData, error } = await supabase
          .from('company_assets')
          .select('*, purchase_requests(requester_name, department_name)')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });
        if (error) throw error;

        const assignedIds = [...new Set((rawData || []).map((r: any) => r.assigned_to_employee_id).filter(Boolean))] as string[];
        let empMap: Record<string, { full_name: string; department_id: string | null }> = {};
        let deptMap: Record<string, string> = {};
        if (assignedIds.length > 0) {
          const { data: emps } = await supabase.from('employees').select('id, full_name, department_id').in('id', assignedIds);
          empMap = (emps || []).reduce((acc, e) => ({ ...acc, [e.id]: { full_name: e.full_name, department_id: e.department_id ?? null } }), {});
          const deptIds = [...new Set((emps || []).map((e) => e.department_id).filter(Boolean))] as string[];
          if (deptIds.length > 0) {
            const { data: depts } = await supabase.from('departments').select('id, name').in('id', deptIds);
            deptMap = (depts || []).reduce((acc, d) => ({ ...acc, [d.id]: d.name }), {});
          }
        }

        const data = (rawData || []).map((row: any) => {
          const pr = row.purchase_requests;
          const requester_name = Array.isArray(pr) ? pr[0]?.requester_name : pr?.requester_name;
          const department_name = Array.isArray(pr) ? pr[0]?.department_name : pr?.department_name;
          const emp = row.assigned_to_employee_id ? empMap[row.assigned_to_employee_id] : null;
          const assigned_employee_name = emp?.full_name ?? null;
          const assigned_department_name = emp?.department_id ? (deptMap[emp.department_id] ?? null) : null;
          const { purchase_requests: _pr, ...rest } = row;
          return {
            ...rest,
            requester_name: requester_name ?? null,
            department_name: department_name ?? null,
            assigned_employee_name: assigned_employee_name ?? null,
            assigned_department_name: assigned_department_name ?? null,
          };
        });
        setAssets(data);
      } catch (fallbackError: any) {
        console.error('Error fetching assets:', fallbackError);
        showToast({
          title: t('common.error', 'Error'),
          description: fallbackError?.message || t('companyAssets.fetchFailed', 'Failed to fetch assets'),
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, showToast, t]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const handleAddAsset = useCallback((assetData: any) => {
    console.log('Adding asset:', assetData);
    setIsAddModalOpen(false);
    fetchAssets();
  }, [fetchAssets]);

  const handleRefresh = useCallback(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Get the latest asset's created_at date for last updated
  const lastUpdated = assets.length > 0 
    ? assets[0].created_at 
    : undefined;

  return (
    <StandardLayout>
      <div className="h-full bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col overflow-hidden">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeTab={activeTab} 
                  onTabChange={handleTabChange} 
                />
              </div>

              {/* Grid Layout: 12 columns (9-3) */}
              <div className="flex-1 grid grid-cols-12 gap-2 min-h-0">
                {/* Main Content - 9 columns */}
                <div className="col-span-9 h-full">
                  <div className="h-full flex flex-col">
                    {/* Filter Section */}
                    <div className="flex-shrink-0 mb-2">
                      <div className="bg-white border rounded-md p-2">
                        <AssetsFilters
                          selectedCategory={selectedCategory}
                          selectedStatus={selectedStatus}
                          selectedCondition={selectedCondition}
                          selectedReceiptFilter={selectedReceiptFilter}
                          onReceiptFilterChange={setSelectedReceiptFilter}
                          onCategoryChange={setSelectedCategory}
                          onStatusChange={setSelectedStatus}
                          onConditionChange={setSelectedCondition}
                          searchTerm={searchTerm}
                          onSearchChange={setSearchTerm}
                          onRefresh={handleRefresh}
                          onAddAsset={() => setIsAddModalOpen(true)}
                        />
                      </div>
                    </div>
                    
                    {/* Metrics Cards Section */}
                    <div className="flex-shrink-0 mb-2">
                      <CompanyAssetsMetricsCards assets={assets} />
                    </div>
                    
                    {/* Table Section - Main Content */}
                    <div className="flex-1 min-h-0">
                      <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col seamless-scroll">
                        <AssetsTable 
                          assets={assets}
                          searchTerm={searchTerm}
                          selectedCategory={selectedCategory}
                          selectedStatus={selectedStatus}
                          selectedCondition={selectedCondition}
                          selectedReceiptFilter={selectedReceiptFilter}
                          isLoading={isLoading}
                          onRefresh={fetchAssets}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right Column - Overview Sidebar (25% like employee page) */}
                <div className="col-span-3 h-full">
                  <div className="h-full flex flex-col">
                    <div className="bg-white border rounded-lg h-full flex flex-col">
                      {/* Sidebar Header */}
                      <div className="px-4 py-1.5 border-b flex-shrink-0">
                        <div className="flex flex-col">
                          <h3 className="text-sm font-semibold text-gray-900">Assets Overview</h3>
                          <p className="text-xs text-gray-500 mt-1">Latest asset activities and status</p>
                        </div>
                      </div>

                      {/* Scrollable Sidebar Content */}
                      <div className="flex-1 overflow-y-auto seamless-scroll p-4 space-y-4">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 gap-3">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium text-blue-800">Total Assets</p>
                                <p className="text-lg font-bold text-blue-900">{assets.length}</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium text-green-800">Available</p>
                                <p className="text-lg font-bold text-green-900">
                                  {assets.filter(a => a.status === 'available').length}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="p-3 bg-amber-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium text-amber-800">In Use</p>
                                <p className="text-lg font-bold text-amber-900">
                                  {assets.filter(a => a.status === 'in-use').length}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium text-red-800">Maintenance</p>
                                <p className="text-lg font-bold text-red-900">
                                  {assets.filter(a => a.status === 'maintenance').length}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Sidebar Footer */}
                      <CompanyAssetsOverviewFooter
                        lastUpdated={lastUpdated}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Asset Modal */}
      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddAsset}
      />
    </StandardLayout>
  );
};

