import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Label } from '@/features/ui/label';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useShowToast } from '@/features/share/hooks/useShowToast';
import { useHandoverAsset } from './hooks/useAssetAssignments';
import { useEmployeesForAssign } from './hooks/useEmployeesForAssign';
import { ArrowRightLeft, FileText, X } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

interface Asset {
  id: string;
  name: string;
  status: string;
  assigned_to_employee_id?: string | null;
}

interface HandoverAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset | null;
  onSuccess: () => void;
}

export const HandoverAssetModal = ({ isOpen, onClose, asset, onSuccess }: HandoverAssetModalProps) => {
  const { t } = useAppTranslation();
  const showToast = useShowToast();
  const handoverMutation = useHandoverAsset();
  const { data: employees = [], isLoading: employeesLoading } = useEmployeesForAssign();
  const [newEmployeeId, setNewEmployeeId] = useState('');
  const [handoverType, setHandoverType] = useState<'transfer' | 'resignation'>('transfer');
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) {
      showToast({ title: t('common.error', 'Error'), description: t('companyAssets.fileMax10MB', 'File size max 10MB'), variant: 'destructive' });
      return;
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      showToast({ title: t('common.error', 'Error'), description: t('companyAssets.fileTypesPdfJpgPng', 'PDF, JPG, PNG only'), variant: 'destructive' });
      return;
    }
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!asset?.id) return;
    const isResignationReturn = handoverType === 'resignation' && !newEmployeeId;
    if (!isResignationReturn && !newEmployeeId) {
      showToast({ title: t('common.error', 'Error'), description: t('companyAssets.selectEmployee', 'Select employee'), variant: 'destructive' });
      return;
    }
    if (!file) {
      showToast({ title: t('common.error', 'Error'), description: t('companyAssets.assignDocumentRequired', 'Handover document required'), variant: 'destructive' });
      return;
    }
    try {
      await handoverMutation.mutateAsync({
        assetId: asset.id,
        newEmployeeId: isResignationReturn ? null : newEmployeeId,
        handoverType,
        file,
        notes,
      });
      showToast({ title: isResignationReturn ? t('companyAssets.returnSuccess', 'Asset returned successfully.') : t('companyAssets.handoverSuccess', 'Handover recorded successfully.'), description: '', variant: 'default' });
      setNewEmployeeId('');
      setHandoverType('transfer');
      setFile(null);
      setNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast({ title: t('common.error', 'Error'), description: err?.message ?? t('common.failed', 'Failed'), variant: 'destructive' });
    }
  };

  const handleClose = () => {
    setNewEmployeeId('');
    setHandoverType('transfer');
    setFile(null);
    setNotes('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  };

  const filteredEmployees = employees.filter((e) => e.id !== asset?.assigned_to_employee_id);

  if (!asset) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            {t('companyAssets.handoverAsset', 'Handover')}
          </DialogTitle>
          <DialogDescription>
            {asset.name} — {t('companyAssets.handoverDescription', 'Select new recipient or leave empty to return to company, then upload handover document.')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>{t('companyAssets.handoverType', 'Handover type')} *</Label>
            <Select value={handoverType} onValueChange={(v: 'transfer' | 'resignation') => setHandoverType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">{t('companyAssets.handoverTypeTransfer', 'Transfer')}</SelectItem>
                <SelectItem value="resignation">{t('companyAssets.handoverTypeResignation', 'Resignation')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>
              {t('companyAssets.recipientNewEmployee', 'Recipient (new employee)')}
              {handoverType === 'transfer' ? ' *' : ` (${t('companyAssets.optionalReturnToCompany', 'optional, leave empty = return to company')})`}
            </Label>
            <Select value={newEmployeeId} onValueChange={setNewEmployeeId} disabled={employeesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={employeesLoading ? t('common.loading', 'Loading...') : t('companyAssets.selectEmployee', 'Select employee')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('companyAssets.returnToCompanyNoRecipient', 'Return to company (no recipient)')}</SelectItem>
                {filteredEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name} {emp.department_name ? `(${emp.department_name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('companyAssets.handoverDocumentLabel', 'Handover document')} *</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="flex-1"
              />
              {file && (
                <Button type="button" variant="ghost" size="sm" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {file && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><FileText className="h-3 w-3" /> {file.name}</p>}
          </div>
          <div>
            <Label>{t('companyAssets.notesOptional', 'Notes (optional)')}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>{t('common.cancel', 'Cancel')}</Button>
            <Button
              onClick={handleSubmit}
              disabled={
                handoverMutation.isPending ||
                !file ||
                (handoverType === 'transfer' && !newEmployeeId)
              }
            >
              {handoverMutation.isPending ? t('common.loading', 'Loading...') : t('companyAssets.handoverButton', 'Handover')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
