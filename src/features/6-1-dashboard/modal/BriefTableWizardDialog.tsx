import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import {
  BRIEF_TABLE_DEFAULT_COLUMN_COUNT,
  BRIEF_TABLE_DEFAULT_INITIAL_ROWS,
  BRIEF_TABLE_MAX_COLUMNS,
  BRIEF_TABLE_MAX_INITIAL_ROWS,
  BRIEF_TABLE_MIN_COLUMNS,
  BRIEF_TABLE_MIN_INITIAL_ROWS,
  createEmptyTableData,
} from '../utils/markdownTableUtils';

export interface BriefTableWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (tableData: string[][]) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resizeHeaders(headers: string[], columnCount: number): string[] {
  const next = headers.slice(0, columnCount);
  while (next.length < columnCount) {
    next.push('');
  }
  return next;
}

export const BriefTableWizardDialog: React.FC<BriefTableWizardDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
}) => {
  const { t } = useAppTranslation();
  const [columnCount, setColumnCount] = useState(BRIEF_TABLE_DEFAULT_COLUMN_COUNT);
  const [headers, setHeaders] = useState<string[]>(
    Array.from({ length: BRIEF_TABLE_DEFAULT_COLUMN_COUNT }, () => '')
  );
  const [initialRows, setInitialRows] = useState(BRIEF_TABLE_DEFAULT_INITIAL_ROWS);

  useEffect(() => {
    if (!open) return;
    setColumnCount(BRIEF_TABLE_DEFAULT_COLUMN_COUNT);
    setHeaders(Array.from({ length: BRIEF_TABLE_DEFAULT_COLUMN_COUNT }, () => ''));
    setInitialRows(BRIEF_TABLE_DEFAULT_INITIAL_ROWS);
  }, [open]);

  const handleColumnCountChange = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const nextCount = clamp(parsed, BRIEF_TABLE_MIN_COLUMNS, BRIEF_TABLE_MAX_COLUMNS);
    setColumnCount(nextCount);
    setHeaders((prev) => resizeHeaders(prev, nextCount));
  };

  const handleInitialRowsChange = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    setInitialRows(clamp(parsed, BRIEF_TABLE_MIN_INITIAL_ROWS, BRIEF_TABLE_MAX_INITIAL_ROWS));
  };

  const handleConfirm = () => {
    const tableData = createEmptyTableData(headers, initialRows);
    onConfirm(tableData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 text-left px-4 pt-4 pb-3">
          <DialogTitle className="text-lg font-semibold">
            {t('briefDialog.tableWizard.title', 'Buat tabel custom')}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t('briefDialog.tableWizard.description', 'Tentukan kolom dan baris awal untuk storyboard brief.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 seamless-scroll">
          <div className="space-y-2">
            <Label htmlFor="brief-table-column-count">
              {t('briefDialog.tableWizard.columnCount', 'Jumlah kolom')}
            </Label>
            <Input
              id="brief-table-column-count"
              type="number"
              min={BRIEF_TABLE_MIN_COLUMNS}
              max={BRIEF_TABLE_MAX_COLUMNS}
              value={columnCount}
              onChange={(e) => handleColumnCountChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('briefDialog.tableWizard.headerNames', 'Nama kolom')}</Label>
            <div className="space-y-2">
              {headers.map((header, index) => (
                <Input
                  key={index}
                  value={header}
                  onChange={(e) => {
                    const value = e.target.value;
                    setHeaders((prev) => {
                      const next = [...prev];
                      next[index] = value;
                      return next;
                    });
                  }}
                  placeholder={t('briefDialog.tableWizard.headerNamePlaceholder', 'Kolom {{n}}', {
                    n: index + 1,
                  })}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brief-table-initial-rows">
              {t('briefDialog.tableWizard.initialRows', 'Jumlah baris awal')}
            </Label>
            <Input
              id="brief-table-initial-rows"
              type="number"
              min={BRIEF_TABLE_MIN_INITIAL_ROWS}
              max={BRIEF_TABLE_MAX_INITIAL_ROWS}
              value={initialRows}
              onChange={(e) => handleInitialRowsChange(e.target.value)}
            />
          </div>
        </div>

        <div className="px-4 pt-3 pb-3 flex-shrink-0 border-t bg-muted/30">
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="min-w-[120px]"
            >
              {t('briefDialog.tableWizard.confirm', 'Buat tabel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
