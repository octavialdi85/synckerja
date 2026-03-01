import React from 'react';
import { Button } from '@/features/ui/button';
import { Pencil } from 'lucide-react';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

interface RevisionTableProps {
  tableData: string[][];
  tableMarkdown: string;
  startIndex: number;
  endIndex: number;
  onRevisiCell: (params: { rowIndex: number; colIndex: number; value: string }) => void;
  onRevisiRow: (params: { rowIndex: number; rowContent: string }) => void;
  onRevisiSection: (content: string) => void;
  disabled?: boolean;
}

function buildRowMarkdown(header: string[], row: string[]): string {
  const pad = (arr: string[], len: number) => {
    const a = [...arr];
    while (a.length < len) a.push('');
    return a.slice(0, len);
  };
  const colCount = Math.max(header.length, row.length);
  const h = pad(header, colCount);
  const r = pad(row, colCount);
  return `| ${h.join(' | ')} |\n| ${r.join(' | ')} |`;
}

export const RevisionTable: React.FC<RevisionTableProps> = ({
  tableData,
  tableMarkdown,
  startIndex,
  endIndex,
  onRevisiCell,
  onRevisiRow,
  onRevisiSection,
  disabled = false,
}) => {
  const { t } = useAppTranslation();
  if (!tableData || tableData.length === 0) return null;

  const header = tableData[0];
  const body = tableData.slice(1);

  return (
    <div className="my-4 group relative">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-x divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr className="divide-x divide-gray-200">
              {header.map((cell, ci) => (
                <th
                  key={ci}
                  className="px-4 py-3 text-left font-semibold text-gray-800 whitespace-nowrap border-b border-gray-200"
                >
                  {cell}
                </th>
              ))}
              <th className="px-2 py-3 w-10 border-b border-gray-200" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {body.map((row, ri) => (
              <tr key={ri} className="divide-x divide-gray-200 hover:bg-gray-50/50 transition-colors group/row">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-3 text-gray-700 align-top group/cell relative">
                    <span className="pr-8">{cell}</span>
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 transition-opacity p-1 h-6 w-6"
                        onClick={() => onRevisiCell({ rowIndex: ri + 1, colIndex: ci, value: cell })}
                        title={t('scriptGenerator.revisi.button', 'Revisi')}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                ))}
                <td className="px-2 py-3 align-middle">
                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover/row:opacity-100 transition-opacity p-1.5 h-7 text-xs"
                      onClick={() =>
                        onRevisiRow({
                          rowIndex: ri + 1,
                          rowContent: buildRowMarkdown(header, row),
                        })
                      }
                      title={t('scriptGenerator.revisi.revisiRow', 'Revisi seluruh baris (VO, Visual, Element, Tagging menyesuaikan)')}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      {t('scriptGenerator.revisi.revisiRowShort', 'Baris')}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 h-8"
        onClick={() => onRevisiSection(tableMarkdown)}
        disabled={disabled}
        title={t('scriptGenerator.revisi.revisiSection', 'Revisi seluruh tabel')}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
};
