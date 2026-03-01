import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Textarea } from '@/features/ui/textarea';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { Loader2 } from 'lucide-react';

interface RevisiModalProps {
  open: boolean;
  onClose: () => void;
  originalText: string;
  sectionLabel?: string;
  onConfirm: (instruction: string) => Promise<void>;
  isRevising?: boolean;
}

export const RevisiModal: React.FC<RevisiModalProps> = ({
  open,
  onClose,
  originalText,
  sectionLabel,
  onConfirm,
  isRevising = false,
}) => {
  const { t } = useAppTranslation();
  const [instruction, setInstruction] = useState('');

  useEffect(() => {
    if (open) {
      setInstruction('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = instruction.trim();
    if (!trimmed) return;
    try {
      await onConfirm(trimmed);
      onClose();
    } catch {
      // Parent handles error (toast); modal stays open for retry
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg" style={{ zIndex: 999999 }}>
        <DialogHeader>
          <DialogTitle>
            {t('scriptGenerator.revisi.modalTitle', 'Revisi bagian ini')}
            {sectionLabel ? ` - ${sectionLabel}` : ''}
          </DialogTitle>
          <DialogDescription>
            {t('scriptGenerator.revisi.modalDescription', 'Ketik instruksi revisi. AI akan merevisi hanya bagian yang dipilih.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('scriptGenerator.revisi.instructionLabel', 'Instruksi revisi')}
            </label>
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder={t('scriptGenerator.revisi.instructionPlaceholder', 'Contoh: buat lebih singkat, tambah contoh, ubah tone jadi lebih formal')}
              className="min-h-[80px]"
              disabled={isRevising}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              {t('scriptGenerator.revisi.originalPreview', 'Teks yang akan direvisi')}
            </label>
            <pre className="text-xs p-3 rounded-md border bg-muted/50 max-h-[120px] overflow-y-auto whitespace-pre-wrap">
              {originalText || '-'}
            </pre>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isRevising}>
              {t('common.cancel', 'Batal')}
            </Button>
            <Button type="submit" disabled={isRevising || !instruction.trim()}>
              {isRevising ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('scriptGenerator.revisi.revising', 'Merevisi...')}
                </>
              ) : (
                t('scriptGenerator.revisi.button', 'Revisi')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
