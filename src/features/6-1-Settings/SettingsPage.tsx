import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { HeaderAndTab } from './section/HeaderAndTab';
import { SettingsSidebar } from './section/SettingsSidebar';
import { ApprovalAccessSection } from './section/ApprovalAccessSection';
import { ContentSchedulingSection } from './section/ContentSchedulingSection';
import { ScriptAIConfigSection } from './section/ScriptAIConfigSection';
import { DigitalAssetsSection } from './section/DigitalAssetsSection';
import { DetectFromImageSection } from './section/DetectFromImageSection';
import { ComingSoonSection } from './section/ComingSoonSection';
import { ApprovalAccessModal } from './modal/ApprovalAccessModal';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const [activeSection, setActiveSection] = useState('approval-access');
  const [activeMainTab, setActiveMainTab] = useState('settings');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [approvalConfigs, setApprovalConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const isAdmin = ['owner', 'admin', 'hr'].includes(userRole || '');

  // Fetch approval configurations on component mount
  useEffect(() => {
    fetchApprovalConfigs();
  }, []);

  const fetchApprovalConfigs = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Get user's active organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('active_organization_id')
        .eq('user_id', user.id)
        .single() as { data: { active_organization_id: string } | null; error: any };

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        toast.error('Failed to fetch user profile');
        return;
      }

      if (!profile || !profile.active_organization_id) {
        toast.error('No active organization found');
        return;
      }

      // Fetch current user's role in this organization
      const { data: roleRow, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', profile.active_organization_id)
        .maybeSingle() as { data: { role: string } | null; error: any };

      if (roleError) {
        console.error('Error fetching user role:', roleError);
      }
      setUserRole(roleRow ? roleRow.role : null);

      // Fetch approval configurations for the organization
      const { data, error } = await supabase
        .from('approval_access_configurations')
        .select('*')
        .eq('organization_id', profile.active_organization_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching approval configs:', error);
        toast.error('Failed to fetch approval configurations');
        return;
      }

      // Transform data to match expected format
      const transformedConfigs = (data || []).map(config => ({
        id: config.id,
        columnType: config.column_type,
        columnName: config.column_name,
        allowedRoles: config.allowed_roles || [],
        exceptions: config.exceptions || [],
        isActive: config.is_active
      }));

      setApprovalConfigs(transformedConfigs);
    } catch (error) {
      console.error('Error fetching approval configs:', error);
      toast.error('Failed to fetch approval configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddConfig = (success: boolean) => {
    if (success) {
      fetchApprovalConfigs();
      setIsModalOpen(false);
    }
  };

  const handleEditConfig = (success: boolean) => {
    if (success) {
      fetchApprovalConfigs();
      setIsEditModalOpen(false);
      setEditingConfig(null);
    }
  };

  const handleUpdateConfig = async (id: string, updates: any) => {
    try {
      const { error } = await (supabase as any)
        .from('approval_access_configurations')
        .update({
          is_active: updates.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating config:', error);
        toast.error('Failed to update configuration');
        return;
      }

      setApprovalConfigs(prev => 
        prev.map(config => 
          config.id === id ? { ...config, ...updates } : config
        )
      );

      toast.success('Configuration updated successfully');
    } catch (error) {
      console.error('Error updating config:', error);
      toast.error('Failed to update configuration');
    }
  };

  const handleDeleteConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('approval_access_configurations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting config:', error);
        toast.error('Failed to delete configuration');
        return;
      }

      setApprovalConfigs(prev => prev.filter(config => config.id !== id));
      toast.success('Configuration deleted successfully');
    } catch (error) {
      console.error('Error deleting config:', error);
      toast.error('Failed to delete configuration');
    }
  };

  const handleTabChange = (newTab: string) => {
    setActiveMainTab(newTab);
    navigate(`/digital-marketing/social-media/${newTab}`);
  };

  const onNavigateToDetectImage = () => setActiveSection('detect-from-image');

  const renderContent = () => {
    switch (activeSection) {
      case 'approval-access':
        return (
          <ApprovalAccessSection
            approvalConfigs={approvalConfigs}
            isLoading={isLoading}
            isAdmin={isAdmin}
            onAddConfig={() => setIsModalOpen(true)}
            onUpdateConfig={handleUpdateConfig}
            onDeleteConfig={handleDeleteConfig}
            onEditConfig={(config) => {
              setEditingConfig(config);
              setIsEditModalOpen(true);
            }}
          />
        );
      case 'scheduling':
        return <ContentSchedulingSection />;
      case 'asset-digital':
        return <DigitalAssetsSection onNavigateToDetectImage={onNavigateToDetectImage} />;
      case 'detect-from-image':
        return <DetectFromImageSection />;
      case 'script-ai':
        return <ScriptAIConfigSection />;
      default:
        return <ComingSoonSection />;
    }
  };

  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 px-4 pb-4">
            <div className="h-full flex flex-col overflow-hidden">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeMainTab={activeMainTab}
                  handleTabChange={handleTabChange}
                />
              </div>

              {/* Main Content Area - Grid: sidebar kiri + section utama kanan — scroll-chaining rule 3.1: satu scroll per panel */}
              <div className="flex-1 grid grid-cols-12 gap-2 min-h-0 max-h-[calc(100vh-120px)] overflow-hidden">
                {/* Left Column - Sidebar (menu) - 3 columns — rule 3.1 */}
                <div className="col-span-3 flex flex-col min-h-0 overflow-hidden">
                  <div className="bg-white border rounded-lg shadow-sm flex-1 min-h-0 flex flex-col overflow-hidden max-h-full">
                    <div className="px-4 py-1.5 border-b flex-shrink-0">
                      <h3 className="text-sm font-semibold text-gray-900">Pengaturan Social Media</h3>
                      <p className="text-xs text-gray-500 mt-1">Konfigurasi sistem social media</p>
                    </div>
                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain p-3">
                      <SettingsSidebar
                        activeSection={activeSection}
                        onSectionChange={setActiveSection}
                      />
                    </div>
                    <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Settings Overview</span>
                        <span className="text-xs text-gray-400">Real-time</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Section utama (konten) - 9 columns — rule 3.1 */}
                <div className="col-span-9 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex-1 min-h-0 flex flex-col overflow-hidden max-h-full">
                    <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden max-h-full">
                      {/* Content Header */}
                      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <h2 className="text-sm font-semibold text-gray-900 truncate">
                              {activeSection === 'approval-access' ? 'Approval Access' : 
                               activeSection === 'scheduling' ? 'Content Scheduling' : 
                               activeSection === 'asset-digital' ? 'Digital Assets' : 
                               activeSection === 'detect-from-image' ? t('detectFromImage.title', 'Detect from Image') :
                               activeSection === 'script-ai' ? 'Script AI Configuration' : 'Settings'}
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">
                              {activeSection === 'approval-access' ? 'Manage approval access configurations' : 
                               activeSection === 'scheduling' ? 'Configure required platforms for content scheduling' : 
                               activeSection === 'asset-digital' ? 'Manage digital assets and media library' : 
                               activeSection === 'detect-from-image' ? t('detectFromImage.description', 'Analyze image with AI then save to Character or Object') :
                               activeSection === 'script-ai' ? 'Konfigurasi Google AI API untuk Script Generator' : 
                               'Configure social media settings'}
                            </p>
                          </div>
                          {activeSection === 'approval-access' && (
                            <button
                              onClick={() => setIsModalOpen(true)}
                              disabled={isLoading || !isAdmin}
                              title={isAdmin ? undefined : 'Only admins can create configurations'}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ml-4"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                                <path d="M5 12h14"></path>
                                <path d="M12 5v14"></path>
                              </svg>
                              Add New Configuration
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Scrollable Content — rule 3.1: satu scroll container, nested-scroll-touch-chain */}
                      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain">
                        <div className="p-4">
                          {renderContent()}
                        </div>
                      </div>

                      {/* Content Footer */}
                      <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Total Settings: <span className="font-medium">1</span></span>
                          <span className="text-xs text-gray-400">Status: <span className="font-medium text-green-600">Active</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <ApprovalAccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddConfig}
      />

      <ApprovalAccessModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingConfig(null);
        }}
        onSave={handleEditConfig}
        editData={editingConfig}
      />
    </StandardLayout>
  );
};

export default SettingsPage;
