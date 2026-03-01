import { stringifyMarkdownTable } from '@/features/6-1-dashboard/utils/markdownTableUtils';
import { parseMarkdownTable } from '@/features/6-1-dashboard/utils/markdownTableUtils';

/**
 * Merge revised part back into full script.
 * @param fullScript - The complete script
 * @param originalText - The text that was revised
 * @param revisedText - The AI-revised text
 * @param startIndex - Optional: start index of original in fullScript (from section parser)
 * @param endIndex - Optional: end index of original in fullScript
 * @returns Updated full script
 */
export function mergeRevisedPart(
  fullScript: string,
  originalText: string,
  revisedText: string,
  startIndex?: number,
  endIndex?: number
): string {
  if (startIndex !== undefined && endIndex !== undefined) {
    return fullScript.slice(0, startIndex) + revisedText + fullScript.slice(endIndex);
  }

  // From text selection: find originalText in fullScript
  const exactIdx = fullScript.indexOf(originalText);
  if (exactIdx >= 0) {
    return fullScript.slice(0, exactIdx) + revisedText + fullScript.slice(exactIdx + originalText.length);
  }

  // Fallback: try trimmed original (handles extra whitespace from selection)
  const trimmedOriginal = originalText.trim();
  if (trimmedOriginal) {
    const trimmedIdx = fullScript.indexOf(trimmedOriginal);
    if (trimmedIdx >= 0) {
      return fullScript.slice(0, trimmedIdx) + revisedText + fullScript.slice(trimmedIdx + trimmedOriginal.length);
    }
  }

  // Could not find - return fullScript unchanged (caller should handle error)
  return fullScript;
}

export interface TableCellRevision {
  tableStartIndex: number;
  tableEndIndex: number;
  rowIndex: number;
  colIndex: number;
  revisedCellValue: string;
}

export interface TableRowRevision {
  tableStartIndex: number;
  tableEndIndex: number;
  rowIndex: number;
  revisedRowMarkdown: string;
}

/**
 * Parse a markdown table row line into cells (e.g. "| a | b | c |" -> ["a","b","c"])
 */
function parseRowLine(line: string): string[] {
  const parts = line.trim().split('|');
  return parts
    .slice(1, -1)
    .map((p) => p.trim());
}

/**
 * Merge a full table row revision into the full script.
 * AI returns the revised row in markdown format; we replace the row at rowIndex.
 */
export function mergeTableRowRevision(
  fullScript: string,
  params: TableRowRevision
): string {
  const { tableStartIndex, tableEndIndex, rowIndex, revisedRowMarkdown } = params;
  const tableMarkdown = fullScript.slice(tableStartIndex, tableEndIndex);
  const parsed = parseMarkdownTable(tableMarkdown);
  if (!parsed || !parsed.table[rowIndex]) return fullScript;

  const lines = revisedRowMarkdown.trim().split('\n').filter((l) => l.trim());
  let newCells: string[] = [];
  for (const line of lines) {
    if (!line.trim().startsWith('|') || !line.trim().endsWith('|')) continue;
    const cells = parseRowLine(line);
    const isAlignment = cells.length > 0 && cells.every((c) => /^[\s:\-]+$/.test(c));
    if (cells.length > 0 && !isAlignment) {
      newCells = cells;
    }
  }
  if (newCells.length === 0) return fullScript;

  const colCount = parsed.table[0]?.length ?? newCells.length;
  while (newCells.length < colCount) newCells.push('');
  if (newCells.length > colCount) newCells = newCells.slice(0, colCount);

  const newTable = parsed.table.map((r, ri) =>
    ri === rowIndex ? newCells : r
  );
  const newTableMarkdown = stringifyMarkdownTable(newTable);
  return fullScript.slice(0, tableStartIndex) + newTableMarkdown + fullScript.slice(tableEndIndex);
}

/**
 * Merge a single table cell revision into the full script.
 */
export function mergeTableCellRevision(
  fullScript: string,
  params: TableCellRevision
): string {
  const { tableStartIndex, tableEndIndex, rowIndex, colIndex, revisedCellValue } = params;
  const tableMarkdown = fullScript.slice(tableStartIndex, tableEndIndex);
  const parsed = parseMarkdownTable(tableMarkdown);
  if (!parsed || !parsed.table[rowIndex]) return fullScript;

  const row = parsed.table[rowIndex];
  if (colIndex >= row.length) return fullScript;

  const newTable = parsed.table.map((r, ri) =>
    ri === rowIndex
      ? r.map((c, ci) => (ci === colIndex ? revisedCellValue : c))
      : r
  );
  const newTableMarkdown = stringifyMarkdownTable(newTable);
  return fullScript.slice(0, tableStartIndex) + newTableMarkdown + fullScript.slice(tableEndIndex);
}
