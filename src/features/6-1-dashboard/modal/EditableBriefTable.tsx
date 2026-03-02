import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/features/ui/button';
import { Pencil, Check, X } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { cn } from '@/lib/utils';

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
  onSave: (newTableData: string[][]) => void;
  className?: string;
}

export const EditableBriefTable: React.FC<EditableBriefTableProps> = ({
  tableData,
  onSave,
  className = '',
}) => {
  const { t } = useAppTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<string[][]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Remove trailing empty columns (e.g. extra pipe in markdown creates empty column after Tagging)
  const trimEmptyColumns = (rows: string[][]): string[][] => {
    if (rows.length === 0) return rows;
    const colCount = Math.max(...rows.map((r) => r.length));
    let lastNonEmptyCol = -1;
    for (let c = 0; c < colCount; c++) {
      const hasContent = rows.some((r) => (r[c] ?? '').trim() !== '');
      if (hasContent) lastNonEmptyCol = c;
    }
    if (lastNonEmptyCol < 0) return rows;
    return rows.map((r) => r.slice(0, lastNonEmptyCol + 1));
  };
  const displayData = trimEmptyColumns(tableData);
  const colCount = Math.max(...displayData.map((r) => r.length), 1);
  const padRow = (row: string[]) => {
    const r = [...row];
    while (r.length < colCount) r.push('');
    return r;
  };

  const startEdit = () => {
    const bodyRows = displayData.slice(1).map(padRow);
    setEditData(bodyRows);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditData([]);
  };

  const saveEdit = () => {
    const scrollTop = scrollContainerRef.current?.scrollTop ?? 0;
    const tableColCount = Math.max(...tableData.map((r) => r.length), 1);
    const padToTableCols = (arr: string[]) => {
      const a = [...arr];
      while (a.length < tableColCount) a.push('');
      return a.slice(0, tableColCount);
    };
    const headerRow = tableData[0] ?? [];
    const newData = [headerRow, ...editData.map(padToTableCols)];
    const finalColCount = Math.max(...newData.map((r) => r.length));
    const padded = newData.map((r) => {
      const a = [...r];
      while (a.length < finalColCount) a.push('');
      return a.slice(0, finalColCount);
    });
    onSave(padded);
    setIsEditing(false);
    setEditData([]);
    setTimeout(() => {
      scrollContainerRef.current?.scrollTo({ top: scrollTop });
    }, 0);
  };

  const updateCell = (rowIdx: number, cellIdx: number, value: string) => {
    setEditData((prev) => {
      const next = prev.map((r) => [...r]);
      const row = next[rowIdx];
      if (!row || cellIdx < 0) return prev;
      const newRow = [...row];
      while (newRow.length <= cellIdx) newRow.push('');
      newRow[cellIdx] = value;
      next[rowIdx] = newRow;
      return next;
    });
  };

  if (displayData.length === 0) return null;

  const headerRow = padRow(displayData[0]);
  const bodyRows = displayData.slice(1).map(padRow);

  return (
    <div
      ref={scrollContainerRef}
      className={`my-1 overflow-auto rounded-lg border-2 border-gray-300 min-h-[200px] max-h-[min(500px,70vh)] seamless-scroll nested-scroll-touch-chain ${className}`}
      style={{ overflowAnchor: 'none' } as React.CSSProperties}
    >
      <table className="min-w-[720px] w-full text-sm">
        <thead className="sticky top-0 z-20 bg-gray-50 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
          <tr>
            {headerRow.map((cell, j) => (
              <th
                key={j}
                className={cn(
                  'sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-800 whitespace-nowrap border-b-2 border-r-2 border-gray-200 last:border-r-0 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]',
                  j === 0 && 'w-[80px] min-w-[80px] max-w-[80px]'
                )}
              >
                {cell}
              </th>
            ))}
            <th className="sticky top-0 z-10 w-[72px] min-w-[72px] bg-gray-50 px-2 py-3 border-b-2 border-gray-200 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] font-semibold text-gray-800">
              {isEditing ? (
                <div className="flex gap-1 justify-start">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={saveEdit}
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    title={t('common.save', 'Save')}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    title={t('common.cancel', 'Cancel')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEdit}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                  title={t('common.edit', 'Edit')}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {(isEditing ? editData : bodyRows).map((row, rowIdx) => {
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
                      'px-4 py-3 text-gray-700 align-top border-b border-r border-gray-200 last:border-r-0',
                      cellIdx === 0 && 'w-[80px] min-w-[80px] max-w-[80px]'
                    )}
                  >
                    {isEditing ? (
                      <AutoResizeTextarea
                        value={cell}
                        onChange={(e) => updateCell(rowIdx, cellIdx, e.target.value)}
                        className="w-full min-h-[60px] text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden"
                        minRows={2}
                      />
                    ) : (
                      <span className="whitespace-pre-wrap">{cell}</span>
                    )}
                  </td>
                ))}
                <td className="px-2 py-3 border-b border-gray-200 w-[72px] min-w-[72px]" />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
