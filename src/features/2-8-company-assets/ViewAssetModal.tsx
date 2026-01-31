import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { X, Package, User, Building2, CheckCircle, History, Download } from 'lucide-react';
import { AssetImage } from './asset-details/AssetImage';
import { AssetBasicInfo } from './asset-details/AssetBasicInfo';
import { AssetIdentifiers } from './asset-details/AssetIdentifiers';
import { AssetStatusCondition } from './asset-details/AssetStatusCondition';
import { AssetPurchaseInfo } from './asset-details/AssetPurchaseInfo';
import { AssetNotes } from './asset-details/AssetNotes';
import { AssetCreatedDate } from './asset-details/AssetCreatedDate';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { useCurrentUserRole } from '@/features/share/hooks/useCurrentUserRole';
import { useShowToast } from '@/features/share/hooks/useShowToast';
import { supabase } from '@/integrations/supabase/client';
import { useAssetAssignments } from './hooks/useAssetAssignments';
import { AssetHistoryModal } from './AssetHistoryModal';
import { format } from 'date-fns';

const BUCKET = 'employee-documents';

interface Asset {
  id: string;
  name: string;
  type: string;
  serial_number: string;
  asset_tag: string;
  brand: string;
  model: string;
  condition: string;
  status: string;
  purchase_price: number;
  purchase_date: string;
  notes: string;
  image_url: string;
  created_at: string;
  purchase_request_id?: string | null;
  receipt_confirmed_at?: string | null;
  requester_name?: string | null;
  department_name?: string | null;
  assigned_to_employee_id?: string | null;
  assigned_at?: string | null;
  assigned_employee_name?: string | null;
  assigned_department_name?: string | null;
}

interface ViewAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onRefresh?: () => void;
}

export const ViewAssetModal = ({ isOpen, onClose, asset, onRefresh }: ViewAssetModalProps) => {
  const { t } = useAppTranslation();
  const { user } = useCurrentUser();
  const { data: userRole } = useCurrentUserRole();
  const showToast = useShowToast();
  const [isConfirming, setIsConfirming] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { assignments } = useAssetAssignments(asset?.id ?? null);
  const currentAssignment = assignments.find((a) => !a.ended_at);
  const isHr = userRole === 'hr';

  const handleDownloadCurrentDoc = async () => {
    if (!isHr || !currentAssignment?.document_path) return;
    try {
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(currentAssignment.document_path, 3600);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      showToast({ title: t('common.error', 'Error'), description: err?.message ?? t('common.failed', 'Failed'), variant: 'destructive' });
    }
  };

  const fromPurchaseRequest = !!asset?.purchase_request_id;
  const receiptConfirmed = !!asset?.receipt_confirmed_at;
  const isAdmin = userRole === 'admin';
  const canConfirmReceived = fromPurchaseRequest && !receiptConfirmed && isAdmin;

  const handleConfirmReceived = async () => {
    if (!asset?.id || !user) return;
    setIsConfirming(true);
    try {
      const { error } = await supabase
        .from('company_assets')
        .update({
          receipt_confirmed_at: new Date().toISOString(),
          receipt_confirmed_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', asset.id);

      if (error) throw error;
      showToast({
        title: t('companyAssets.confirmReceivedSuccess', 'Item has been confirmed as received.'),
        description: '',
        variant: 'default',
      });
      onRefresh?.();
      onClose();
    } catch (err: any) {
      showToast({
        title: t('common.error', 'Error'),
        description: err?.message ?? t('companyAssets.editAssetFailed', 'Failed to update asset'),
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[600px] h-[600px] max-w-[90vw] max-h-[90vh] p-0 flex flex-col bg-white" hideCloseButton>
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <DialogTitle className="text-xl font-semibold">{t('companyAssets.assetDetails', 'Asset details')}</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1 h-auto hover:bg-white/80"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div 
          className="flex-1 overflow-y-auto px-6 py-6 space-y-6" 
          style={{ 
            scrollbarWidth: 'thin',
            scrollBehavior: 'smooth',
            scrollbarColor: '#d1d5db transparent'
          }}
        >
          {/* Image Section */}
          {asset.image_url && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <AssetImage imageUrl={asset.image_url} assetName={asset.name} />
            </div>
          )}
          
          {/* Basic Information Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">{t('companyAssets.basicInformation', 'Basic information')}</h3>
            <AssetBasicInfo 
              name={asset.name}
              type={asset.type}
              brand={asset.brand}
              model={asset.model}
            />
          </div>
          
          {/* Identifiers Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">{t('companyAssets.identification', 'Identification')}</h3>
            <AssetIdentifiers 
              serialNumber={asset.serial_number}
              assetTag={asset.asset_tag}
            />
          </div>
          
          {/* Status & Condition Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">{t('companyAssets.statusAndCondition', 'Status & condition')}</h3>
            <AssetStatusCondition 
              status={asset.status}
              condition={asset.condition}
            />
          </div>

          {/* Current assignment (when In Use) */}
          {asset.status === 'in-use' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">{t('companyAssets.currentAssignment', 'Current custodian')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5">
                  <User className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">{t('companyAssets.assignedTo', 'Held by')}</p>
                    <p className="font-medium text-slate-900">{asset.assigned_employee_name ?? '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Building2 className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">{t('companyAssets.assignedDepartment', "Holder's department")}</p>
                    <p className="font-medium text-slate-900">{asset.assigned_department_name ?? '-'}</p>
                  </div>
                </div>
                {asset.assigned_at && (
                  <div className="text-xs text-slate-600">
                    {t('companyAssets.assignedSince', 'Since')}: {format(new Date(asset.assigned_at), 'dd MMM yyyy')}
                  </div>
                )}
              </div>
              {currentAssignment?.document_path && (
                <div className="mt-3 pt-3 border-t">
                  {isHr ? (
                    <Button variant="outline" size="sm" onClick={handleDownloadCurrentDoc}>
                      <Download className="h-4 w-4 mr-2" />
                      {t('companyAssets.downloadDocument', 'Download document')}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t('companyAssets.documentHrOnly', 'Document (HR only)')}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Assignment history (all assets) */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 pb-2 border-b">{t('companyAssets.assignmentHistory', 'Handover history')}</h3>
            <Button variant="secondary" size="sm" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4 mr-2" />
              {t('companyAssets.viewHistory', 'View history')}
            </Button>
          </div>

          {/* Purchase Information Section */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">{t('companyAssets.purchaseHistory', 'Purchase History')}</h3>
            <AssetPurchaseInfo 
              purchasePrice={asset.purchase_price}
              purchaseDate={asset.purchase_date}
            />
          </div>

          {/* Purchase History (from purchase request flow) */}
          {fromPurchaseRequest && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">{t('companyAssets.purchaseHistory', 'Purchase History')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-start gap-2.5">
                  <User className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">{t('companyAssets.requestedBy', 'Requested by')}</p>
                    <p className="font-medium text-slate-900">{asset.requester_name ?? '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Building2 className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">{t('companyAssets.department', 'Department')}</p>
                    <p className="font-medium text-slate-900">{asset.department_name ?? '-'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <span className="text-xs text-slate-500 mr-2">{t('companyAssets.receiptLabel', 'Receipt')}:</span>
                <Badge className={receiptConfirmed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'} variant="secondary">
                  {receiptConfirmed ? t('companyAssets.receiptStatus.received', 'Received') : t('companyAssets.receiptStatus.pendingReceipt', 'Pending receipt')}
                </Badge>
              </div>
              {canConfirmReceived && (
                <Button
                  type="button"
                  onClick={handleConfirmReceived}
                  disabled={isConfirming}
                  className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {isConfirming ? (
                    t('common.loading', 'Loading...')
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {t('companyAssets.confirmReceived', 'Confirm received')}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
          
          {/* Notes Section */}
          {asset.notes && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b">{t('companyAssets.additionalNotes', 'Additional notes')}</h3>
              <AssetNotes notes={asset.notes} />
            </div>
          )}
          
          {/* Created Date Section */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
            <AssetCreatedDate createdAt={asset.created_at} />
          </div>
        </div>
      </DialogContent>
      <AssetHistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        assetId={asset.id}
        assetName={asset.name}
      />
    </Dialog>
  );
};
