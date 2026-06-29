import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/features/ui/button';
import { Pencil, Check, X, MoreVertical, Trash2, Plus, Columns3 } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { cn } from '@/lib/utils';
import { normalizeTableData } from '../utils/markdownTableUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/features/ui/dropdown-menu';

/** Auto-resize textarea to fit content height */
function AutoResizeTextarea({
  value,
  onChange,
  className,
  minRows = 2,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(minRows * 30, el.scrollHeight)}px`;
  }, [value, minRows]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      className={className}
      rows={minRows}
      {...props}
    />
  );
}

interface EditableBriefTableProps {
  tableData: string[][];
  onSave?: (newTableData: string[][]) => void;
  onChange?: (newTableData: string[][]) => void;
  /** When true, table is always editable (no Edit button), onChange called on every cell change */
  alwaysEditable?: boolean;
  /** When true, no edit/actions column (display-only, e.g. content calendar modal) */
  readOnly?: boolean;
  /** Allow add/remove columns, edit headers, and structure toolbar */
  structureEditable?: boolean;
  /** Where to render Edit/Save/Cancel controls when not alwaysEditable/readOnly */
  controlsPlacement?: 'actionsColumn' | 'taggingColumn';
  className?: string;
}

export const EditableBriefTable: React.FC<EditableBriefTableProps> = ({
  tableData,
  onSave,
  onChange,
  alwaysEditable = false,
  readOnly = false,
  structureEditable = false,
  controlsPlacement = 'actionsColumn',
  className = '',
}) => {
  const { t } = useAppTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<string[][]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const displayData = normalizeTableData(tableData);

  const getWorkingTable = useCallback((): string[][] => {
    if (structureEditable && isEditing && editData.length > 0) {
      return normalizeTableData(editData);
    }
    return displayData;
  }, [structureEditable, isEditing, editData, displayData]);

  const workingTable = getWorkingTable();
  const workingColCount = Math.max(...workingTable.map((r) => r.length), 1);

  const padRow = useCallback(
    (row: string[]) => {
      const r = [...row];
      while (r.length < workingColCount) r.push('');
      return r.slice(0, workingColCount);
    },
    [workingColCount]
  );

  const persistTable = useCallback(
    (rows: string[][]) => {
      const normalized = normalizeTableData(rows);
      onSave?.(normalized);
      return normalized;
    },
    [onSave]
  );

  const startEdit = () => {
    if (structureEditable) {
      setEditData(displayData.map(padRow));
    } else {
      setEditData(displayData.slice(1).map(padRow));
    }
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditData([]);
  };

  const saveEdit = () => {
    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
    if (structureEditable) {
      persistTable(editData);
    } else {
      const tableColCount = Math.max(...tableData.map((r) => r.length), 1);
      const padToTableCols = (arr: string[]) => {
        const a = [...arr];
        while (a.length < tableColCount) a.push('');
        return a.slice(0, tableColCount);
      };
      const headerRow = tableData[0] ?? [];
      const newData = [headerRow, ...editData.map(padToTableCols)];
      persistTable(newData);
    }
    setIsEditing(false);
    setEditData([]);
    setTimeout(() => {
      scrollContainerRef.current?.scrollTo({ top: scrollTop });
    }, 0);
  };

  const handleDeleteRow = (rowIdx: number) => {
    const working = getWorkingTable();
    const headerRow = working[0] ?? [];
    const body = working.slice(1);
    if (body.length <= 1) return;
    const newBody = body.filter((_, i) => i !== rowIdx);
    const newData = [headerRow, ...newBody];
    const normalized = persistTable(newData);
    if (isEditing) {
      setEditData(structureEditable ? normalized : newBody.map(padRow));
    }
  };

  const handleAddRow = (rowIdx: number) => {
    const working = getWorkingTable();
    const headerRow = padRow(working[0] ?? []);
    const body = working.slice(1).map(padRow);
    const currentColCount = Math.max(...working.map((r) => r.length), 1);
    const emptyRow = Array.from({ length: currentColCount }, () => '');
    const newBody = [...body.slice(0, rowIdx + 1), emptyRow, ...body.slice(rowIdx + 1)];
    const newData = [headerRow, ...newBody];
    const normalized = persistTable(newData);
    if (isEditing) {
      setEditData(structureEditable ? normalized : newBody.map(padRow));
    }
  };

  const handleAddRowAtEnd = () => {
    const working = getWorkingTable();
    const headerRow = padRow(working[0] ?? []);
    const body = working.slice(1).map(padRow);
    const currentColCount = Math.max(...working.map((r) => r.length), 1);
    const emptyRow = Array.from({ length: currentColCount }, () => '');
    const newData = [headerRow, ...body, emptyRow];
    const normalized = persistTable(newData);
    if (isEditing && structureEditable) {
      setEditData(normalized);
    }
  };

  const handleAddColumn = () => {
    const working = getWorkingTable();
    const nextColNumber = Math.max(...working.map((r) => r.length), 1) + 1;
    const defaultHeader = t('briefDialog.tableWizard.headerNamePlaceholder', 'Kolom {{n}}', {
      n: nextColNumber,
    });
    const newData = working.map((row, rowIndex) => {
      const padded = padRow(row);
      return rowIndex === 0 ? [...padded, defaultHeader] : [...padded, ''];
    });
    const normalized = persistTable(newData);
    if (isEditing && structureEditable) {
      setEditData(normalized);
    }
  };

  const handleDeleteColumn = (colIdx: number) => {
    const working = getWorkingTable();
    const currentColCount = Math.max(...working.map((r) => r.length), 1);
    if (currentColCount <= 1) return;
    const newData = working.map((row) => row.filter((_, i) => i !== colIdx));
    const normalized = persistTable(newData);
    if (isEditing && structureEditable) {
      setEditData(normalized);
    }
  };

  const updateHeaderCell = (cellIdx: number, value: string) => {
    setEditData((prev) => {
      const next = prev.map((r) => [...r]);
      const header = next[0] ?? [];
      while (header.length <= cellIdx) header.push('');
      header[cellIdx] = value;
      next[0] = header;
      return next;
    });
  };

  const updateCell = (rowIdx: number, cellIdx: number, value: string) => {
    if (alwaysEditable && onChange) {
      const tableColCount = Math.max(...tableData.map((r) => r.length), 1);
      const padToTableCols = (arr: string[]) => {
        const a = [...arr];
        while (a.length < tableColCount) a.push('');
        return a.slice(0, tableColCount);
      };
      const newData = tableData.map((r, i) => {
        if (i !== rowIdx + 1) return [...r];
        const newRow = [...r];
        while (newRow.length <= cellIdx) newRow.push('');
        newRow[cellIdx] = value;
        return padToTableCols(newRow);
      });
      onChange(newData);
      return;
    }

    setEditData((prev) => {
      const next = prev.map((r) => [...r]);
      const dataRowIdx = structureEditable ? rowIdx + 1 : rowIdx;
      const row = next[dataRowIdx];
      if (!row || cellIdx < 0) return prev;
      const newRow = [...row];
      while (newRow.length <= cellIdx) newRow.push('');
      newRow[cellIdx] = value;
      next[dataRowIdx] = newRow;
      return next;
    });
  };

  if (displayData.length === 0) return null;

  const headerRow = padRow(displayData[0]);
  const bodyRowsSource = alwaysEditable
    ? tableData.slice(1)
    : isEditing
      ? structureEditable
        ? editData.slice(1)
        : editData
      : displayData.slice(1);
  const bodyRows = bodyRowsSource.map(padRow);

  const headerDisplayRow =
    structureEditable && isEditing ? padRow(editData[0] ?? headerRow) : padRow(workingTable[0] ?? headerRow);

  const columnLabels = headerDisplayRow.map((cell, index) => {
    const label = (cell ?? '').trim();
    return label || t('briefDialog.tableWizard.headerNamePlaceholder', 'Kolom {{n}}', { n: index + 1 });
  });

  const taggingHeaderIndex = (() => {
    const idx = headerRow.findIndex((h) => String(h ?? '').trim().toLowerCase() === 'tagging');
    return idx >= 0 ? idx : Math.max(0, headerRow.length - 1);
  })();

  const showToolbarEditControls = structureEditable && !alwaysEditable && !readOnly;
  const showActionsColumnControls = !showToolbarEditControls;
  const showRowActions =
    !alwaysEditable && !readOnly && (structureEditable || controlsPlacement === 'actionsColumn');

  const renderEditControls = () => {
    if (alwaysEditable || readOnly) return null;
    if (isEditing) {
      return (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={saveEdit}
            className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 gap-1"
            title={t('common.save', 'Save')}
          >
            <Check className="h-4 w-4" />
            <span className="text-xs hidden sm:inline">{t('common.save', 'Save')}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelEdit}
            className="h-8 px-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 gap-1"
            title={t('common.cancel', 'Cancel')}
          >
            <X className="h-4 w-4" />
            <span className="text-xs hidden sm:inline">{t('common.cancel', 'Cancel')}</span>
          </Button>
        </div>
      );
    }
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={startEdit}
        className="h-8 px-2 gap-1"
        title={t('common.edit', 'Edit')}
      >
        <Pencil className="h-3.5 w-3.5" />
        <span className="text-xs">{t('common.edit', 'Edit')}</span>
      </Button>
    );
  };

  const cellTextareaClass =
    'w-full min-h-[60px] text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden';

  /** First column: time / scene number — keep narrow */
  const firstColClass = 'w-[6.5rem] min-w-[5rem] max-w-[7.5rem]';
  const firstColCellClass = 'px-2 py-3';
  const defaultColCellClass = 'px-4 py-3';

  return (
    <div className={className}>
      {structureEditable && onSave && !readOnly && (
        <div className="flex flex-wrap items-center gap-2 mb-2 px-1">
          <Button type="button" variant="outline" size="sm" onClick={handleAddColumn} className="h-8 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />
            {t('briefDialog.addColumn', 'Tambah kolom')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleAddRowAtEnd} className="h-8 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />
            {t('briefDialog.addRow', 'Tambah baris')}
          </Button>
          {workingColCount > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1">
                  <Columns3 className="h-3.5 w-3.5" />
                  {t('briefDialog.manageColumns', 'Kolom')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  {t('briefDialog.manageColumnsHint', 'Hapus kolom yang tidak dipakai')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columnLabels.map((label, colIdx) => (
                  <DropdownMenuItem
                    key={colIdx}
                    onClick={() => handleDeleteColumn(colIdx)}
                    className="gap-2 text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {showToolbarEditControls && (
            <div className="ml-auto flex items-center gap-1">{renderEditControls()}</div>
          )}
        </div>
      )}
      <div
        ref={scrollContainerRef}
        className="my-1 overflow-x-auto overflow-y-auto rounded-lg border-2 border-gray-300 min-h-0 max-h-[min(720px,78vh)] seamless-scroll nested-scroll-touch-chain"
        style={{ overflowAnchor: 'none' } as React.CSSProperties}
      >
        <table className="min-w-[720px] w-full text-sm table-fixed">
          <colgroup>
            <col style={{ width: '6.5rem' }} />
            {headerDisplayRow.slice(1).map((_, i) => (
              <col key={i} />
            ))}
            {showRowActions && <col style={{ width: '3rem' }} />}
          </colgroup>
          <thead className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
            <tr>
              {headerDisplayRow.map((cell, j) => {
                const shouldRenderControlsInThisHeader =
                  showActionsColumnControls &&
                  controlsPlacement === 'taggingColumn' &&
                  j === taggingHeaderIndex;

                return (
                  <th
                    key={j}
                    className={cn(
                      'sticky top-0 z-10 bg-gray-50 text-left font-semibold text-gray-800 border-b-2 border-r-2 border-gray-200 last:border-r-0 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]',
                      j === 0 ? cn(firstColClass, firstColCellClass) : cn(defaultColCellClass),
                      structureEditable && isEditing ? 'align-top' : j === 0 ? 'whitespace-nowrap' : ''
                    )}
                  >
                    {shouldRenderControlsInThisHeader ? (
                      <div className="flex items-center justify-between gap-2">
                        {structureEditable && isEditing ? (
                          <AutoResizeTextarea
                            value={cell}
                            onChange={(e) => updateHeaderCell(j, e.target.value)}
                            className={cn(
                              cellTextareaClass,
                              'font-semibold',
                              j === 0 ? 'min-h-[36px] text-sm' : 'min-h-[36px]'
                            )}
                            minRows={1}
                          />
                        ) : (
                          <span className="truncate">{cell}</span>
                        )}
                        {renderEditControls()}
                      </div>
                    ) : structureEditable && isEditing ? (
                      <AutoResizeTextarea
                        value={cell}
                        onChange={(e) => updateHeaderCell(j, e.target.value)}
                        className={cn(
                          cellTextareaClass,
                          'font-semibold',
                          j === 0 ? 'min-h-[36px] text-sm' : 'min-h-[36px]'
                        )}
                        minRows={1}
                      />
                    ) : (
                      <span className={cn(j === 0 ? 'truncate block' : 'whitespace-pre-wrap break-words')}>
                        {cell}
                      </span>
                    )}
                  </th>
                );
              })}
              {showActionsColumnControls && !alwaysEditable && !readOnly && controlsPlacement === 'actionsColumn' && (
                <th className="sticky top-0 z-10 w-[72px] min-w-[72px] max-w-[72px] bg-gray-50 px-2 py-3 border-b-2 border-gray-200 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] font-semibold text-gray-800 whitespace-nowrap overflow-hidden">
                  {renderEditControls()}
                </th>
              )}
              {showRowActions && (
                <th className="sticky top-0 z-10 w-[48px] min-w-[48px] max-w-[48px] bg-gray-50 px-1 py-3 border-b-2 border-gray-200 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]" />
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {bodyRows.length === 0 && structureEditable && !isEditing && !alwaysEditable ? (
              <tr>
                <td
                  colSpan={headerDisplayRow.length + (showRowActions ? 1 : 0)}
                  className="px-4 py-6 text-center text-sm text-gray-500 border-b border-gray-200"
                >
                  {t('briefDialog.noTableRows', 'Belum ada baris. Klik "Tambah baris" untuk mulai mengisi.')}
                </td>
              </tr>
            ) : (
              bodyRows.map((row, rowIdx) => {
                const displayRow = padRow(row);
                return (
                  <tr
                    key={rowIdx}
                    className="divide-x divide-gray-200 hover:bg-gray-50/50 transition-colors"
                  >
                    {displayRow.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className={cn(
                          'text-gray-700 align-top border-b border-r border-gray-200 last:border-r-0',
                          cellIdx === 0 ? cn(firstColClass, firstColCellClass) : cn(defaultColCellClass)
                        )}
                      >
                        {isEditing || alwaysEditable ? (
                          <AutoResizeTextarea
                            value={cell}
                            onChange={(e) => updateCell(rowIdx, cellIdx, e.target.value)}
                            className={cellTextareaClass}
                            minRows={2}
                          />
                        ) : (
                          <span className={cn('whitespace-pre-wrap', cellIdx === 0 && 'text-sm tabular-nums')}>
                            {cell || '\u00a0'}
                          </span>
                        )}
                      </td>
                    ))}
                    {showRowActions && (
                      <td className="px-1 py-3 border-b border-gray-200 w-[48px] min-w-[48px] max-w-[48px] whitespace-nowrap overflow-hidden align-middle">
                        {onSave && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                title={t('common.actions', 'Actions')}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleAddRow(rowIdx)}
                                className="gap-2"
                              >
                                <Plus className="h-4 w-4" />
                                {t('briefDialog.addRow', 'Add row')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteRow(rowIdx)}
                                disabled={bodyRows.length <= 1}
                                className="gap-2 text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                                {t('briefDialog.deleteRow', 'Delete row')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
