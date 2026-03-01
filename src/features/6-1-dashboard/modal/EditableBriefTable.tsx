import React, { useState } from 'react';
import { Button } from '@/features/ui/button';
import { Pencil, Check, X } from 'lucide-react';

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
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<string[]>([]);

  const colCount = Math.max(...tableData.map((r) => r.length), 1);
  const padRow = (row: string[]) => {
    const r = [...row];
    while (r.length < colCount) r.push('');
    return r;
  };

  const startEdit = (rowIndex: number) => {
    setEditingRowIndex(rowIndex);
    setEditValues(padRow(tableData[rowIndex] || []));
  };

  const cancelEdit = () => {
    setEditingRowIndex(null);
    setEditValues([]);
  };

  const saveEdit = () => {
    if (editingRowIndex === null) return;
    const newData = tableData.map((row, i) =>
      i === editingRowIndex ? [...editValues] : row
    );
    const colCount = Math.max(...newData.map((r) => r.length));
    const padded = newData.map((r) => {
      const a = [...r];
      while (a.length < colCount) a.push('');
      return a;
    });
    onSave(padded);
    setEditingRowIndex(null);
    setEditValues([]);
  };

  if (tableData.length === 0) return null;

  const headerRow = padRow(tableData[0]);
  const bodyRows = tableData.slice(1).map(padRow);

  return (
    <div className={`my-1 overflow-auto rounded-lg border-2 border-gray-300 min-h-[200px] max-h-[min(500px,70vh)] seamless-scroll nested-scroll-touch-chain ${className}`}>
      <table className="min-w-[720px] w-full text-sm">
        <thead>
          <tr>
            {headerRow.map((cell, j) => (
              <th
                key={j}
                className="sticky top-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-800 whitespace-nowrap border-b-2 border-r-2 border-gray-200 last:border-r-0 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]"
              >
                {cell}
              </th>
            ))}
            <th className="sticky top-0 z-10 w-20 bg-gray-50 px-2 py-3 border-b-2 border-gray-200 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {bodyRows.map((row, rowIdx) => {
            const dataRowIndex = rowIdx + 1;
            const isEditing = editingRowIndex === dataRowIndex;
            const displayRow = isEditing ? padRow(editValues) : row;

            return (
              <tr
                key={rowIdx}
                className="divide-x divide-gray-200 hover:bg-gray-50/50 transition-colors"
              >
                {displayRow.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-4 py-3 text-gray-700 align-top border-b border-r border-gray-200 last:border-r-0"
                  >
                    {isEditing ? (
                      <textarea
                        value={cell}
                        onChange={(e) => {
                          const next = [...displayRow];
                          next[cellIdx] = e.target.value;
                          setEditValues(next);
                        }}
                        className="w-full min-h-[60px] text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={2}
                      />
                    ) : (
                      <span className="whitespace-pre-wrap">{cell}</span>
                    )}
                  </td>
                ))}
                <td className="px-2 py-3 border-b border-gray-200">
                  {isEditing ? (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={saveEdit}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEdit}
                        className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(dataRowIndex)}
                      className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                      title="Edit row"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
