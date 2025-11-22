import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Badge } from '@/features/ui/badge';
import { Search, Plus, RefreshCw, Filter } from 'lucide-react';
import { AssetsTable } from './AssetsTable';
import { AddAssetModal } from './AddAssetModal';
import { AssetsFilters } from './AssetsFilters';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { useShowToast } from '@/features/share/hooks/useShowToast';
import { CompanyAssetsMetricsCards } from './CompanyAssetsMetricsCards';
// This file is deprecated - using CompanyCompanyAssetsPage from 2-8-company-assets instead
// import { HeaderAndTab } from '@/features/2-8-dashboard/section';

export const CompanyAssetsPage = () => {
  const [activeTab, setActiveTab] = useState('assets');

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Types');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [selectedCondition, setSelectedCondition] = useState('All Conditions');
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { organizationId } = useCurrentOrg();
  const showToast = useShowToast();

  const fetchAssets = async () => {
    if (!organizationId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_assets')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setAssets(data || []);
    } catch (error: any) {
      console.error('Error fetching assets:', error);
      showToast({
        title: 'Error',
        description: error.message || 'Failed to fetch assets',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [organizationId]);

  const handleAddAsset = (assetData: any) => {
    console.log('Adding asset:', assetData);
    setIsAddModalOpen(false);
    fetchAssets();
  };

  const handleRefresh = () => {
    fetchAssets();
  };

  return (
    <div className="h-screen bg-gray-100 flex flex-col font-sans relative">
      <div className="flex flex-1 min-h-0">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
          <div className="h-full flex flex-col">
            {/* Header and Tabs */}
            <div className="flex-shrink-0 mb-1">
              <HeaderAndTab 
                activeTab={activeTab} 
                onTabChange={handleTabChange} 
              />
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                <div className="p-2 flex gap-2 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-full">
      {/* Main Content */}
      <div className="flex-1" style={{ flex: '1.8' }}>
        {/* Compact Filter Section */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200/60 p-3 mb-3 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filters */}
            <AssetsFilters
              selectedCategory={selectedCategory}
              selectedStatus={selectedStatus}
              selectedCondition={selectedCondition}
              onCategoryChange={setSelectedCategory}
              onStatusChange={setSelectedStatus}
              onConditionChange={setSelectedCondition}
            />

            {/* Action Buttons */}
            <div className="ml-auto flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-xs"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
              <Button 
                onClick={() => setIsAddModalOpen(true)}
                className="h-8 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Asset
              </Button>
            </div>
          </div>
        </div>
        
        {/* Ultra Compact Metrics Section */}
        <div className="mb-2">
          <div className="grid grid-cols-4 gap-1">
            <CompanyAssetsMetricsCards assets={assets} />
          </div>
        </div>
        
        {/* Assets Table */}
        <div className="bg-white/95 backdrop-blur-sm rounded-md border border-slate-200/60 shadow-sm overflow-hidden relative">
          {/* Modern accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/60 via-indigo-500/40 to-purple-500/30"></div>
          
          <AssetsTable 
            assets={assets}
            searchTerm={searchTerm}
            selectedCategory={selectedCategory}
            selectedStatus={selectedStatus}
            selectedCondition={selectedCondition}
            isLoading={isLoading}
            onRefresh={fetchAssets}
          />
        </div>
      </div>
      
      {/* Sidebar - Width 480px */}
      <div className="w-96 bg-white/90 backdrop-blur-sm rounded-md border border-slate-200/60 shadow-sm overflow-hidden relative" style={{ flex: 'none', width: '480px' }}>
        {/* Subtle accent border */}
        <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/40 via-indigo-400/30 to-purple-400/20"></div>
        
        <div className="p-3 border-b border-slate-100/80 bg-gradient-to-r from-blue-50/30 to-white">
          <h3 className="text-base font-semibold text-slate-800 tracking-tight mb-1">Assets Overview</h3>
          <p className="text-xs text-slate-500">Latest asset activities and status</p>
        </div>
        
        <div className="p-2">
          <div className="space-y-4">
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

            {/* Recent Assets */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Recent Assets</h4>
              
              {assets.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-500">No assets available</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {assets.slice(0, 5).map((asset) => (
                    <div key={asset.id} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {asset.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {asset.type} • {asset.brand}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <Badge 
                            variant={asset.status === 'available' ? 'default' : 
                                   asset.status === 'in-use' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {asset.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
