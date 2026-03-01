import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/features/ui/button';
import { Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { SaveToPlanModal } from './SaveToPlanModal';
import { RevisiModal } from './RevisiModal';
import { ReframeModal } from './ReframeModal';
import { RevisionSectionWrapper } from './RevisionSectionWrapper';
import { RevisionTable } from './RevisionTable';
import { parseScriptSections, type ScriptSection, type SectionType } from '../utils/parseScriptSections';
import { mergeRevisedPart, mergeTableCellRevision, mergeTableRowRevision } from '../utils/mergeRevisedPart';
import { reviseScriptPart, regenerateScriptWithDifferentProblem } from '../services/scriptGeneratorAIService';

const PROSE_CLASS =
  'prose prose-sm max-w-none prose-headings:font-semibold prose-headings:text-gray-900 prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-p:text-gray-700 prose-p:leading-relaxed prose-p:my-3 prose-p:mb-4 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:text-gray-900 prose-hr:my-4 prose-hr:border-gray-200';

const MARKDOWN_COMPONENTS = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-x divide-gray-200 text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-gray-50">{children}</thead>,
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="divide-x divide-gray-200 hover:bg-gray-50/50 transition-colors">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-4 py-3 text-left font-semibold text-gray-800 whitespace-nowrap border-b border-gray-200">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-4 py-3 text-gray-700 align-top">{children}</td>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-lg font-semibold text-gray-900 mt-4 mb-2 first:mt-0 pb-1 border-b border-gray-100">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-base font-semibold text-gray-900 mt-4 mb-2 first:mt-0 pb-1">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-gray-800 mt-3 mb-1">{children}</h3>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-3 mb-4 text-gray-700 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="my-2 ml-4 list-disc space-y-1 text-gray-700">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="my-2 ml-4 list-decimal space-y-1 text-gray-700">{children}</ol>
  ),
  hr: () => <hr className="my-4 border-t-2 border-dashed border-gray-200" />,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-2 pl-4 border-l-4 border-gray-300 text-gray-600 italic">{children}</blockquote>
  ),
};

interface FormDataForPlan {
  content_type_id?: string;
  service_id?: string;
  sub_service_id?: string;
  content_pillar_id?: string;
}

interface AIScriptResultProps {
  script: string;
  formDataForPlan?: FormDataForPlan | null;
  onScriptChange?: (script: string) => void;
}

const SECTION_LABELS: Record<SectionType, string> = {
  concept: 'Concept',
  judul: 'Judul Script',
  formatStyle: 'Format & Style',
  table: 'Tabel',
  caption: 'Caption',
  hashtag: 'Hashtag',
};

export const AIScriptResult: React.FC<AIScriptResultProps> = ({
  script,
  formDataForPlan,
  onScriptChange,
}) => {
  const { t } = useAppTranslation();
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [revisiModalOpen, setRevisiModalOpen] = useState(false);
  const [reframeModalOpen, setReframeModalOpen] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [revisiTarget, setRevisiTarget] = useState<{
    originalText: string;
    startIndex?: number;
    endIndex?: number;
    sectionType: SectionType;
    tableCell?: { rowIndex: number; colIndex: number; tableStartIndex: number; tableEndIndex: number };
    tableRow?: { rowIndex: number; tableStartIndex: number; tableEndIndex: number };
  } | null>(null);
  const [isRevising, setIsRevising] = useState(false);
  const [selectionRevisi, setSelectionRevisi] = useState<string | null>(null);

  const { sections, fullScript } = useMemo(() => parseScriptSections(script), [script]);

  const segments = useMemo(() => {
    const segs: Array<{ start: number; end: number; section?: ScriptSection }> = [];
    const sorted = [...sections].sort((a, b) => a.startIndex - b.startIndex);
    let lastEnd = 0;
    for (const sec of sorted) {
      if (sec.startIndex > lastEnd) {
        segs.push({ start: lastEnd, end: sec.startIndex, section: undefined });
      }
      segs.push({ start: sec.startIndex, end: sec.endIndex, section: sec });
      lastEnd = sec.endIndex;
    }
    if (lastEnd < fullScript.length) {
      segs.push({ start: lastEnd, end: fullScript.length, section: undefined });
    }
    return segs;
  }, [sections, fullScript]);

  const handleRevisiSection = (sectionId: string, content: string, sectionType: SectionType) => {
    const sec = sections.find((s) => s.id === sectionId);
    setRevisiTarget({
      originalText: content,
      startIndex: sec?.startIndex,
      endIndex: sec?.endIndex,
      sectionType,
    });
    setRevisiModalOpen(true);
  };

  const handleRevisiTableCell = (
    rowIndex: number,
    colIndex: number,
    value: string,
    tableStartIndex: number,
    tableEndIndex: number
  ) => {
    setRevisiTarget({
      originalText: value,
      sectionType: 'table',
      tableCell: { rowIndex, colIndex, tableStartIndex, tableEndIndex },
    });
    setRevisiModalOpen(true);
  };

  const handleRevisiTableSection = (tableMarkdown: string) => {
    const tableSec = sections.find((s) => s.type === 'table');
    setRevisiTarget({
      originalText: tableMarkdown,
      startIndex: tableSec?.startIndex,
      endIndex: tableSec?.endIndex,
      sectionType: 'table',
    });
    setRevisiModalOpen(true);
  };

  const handleRevisiTableRow = (
    rowIndex: number,
    rowContent: string,
    tableStartIndex: number,
    tableEndIndex: number
  ) => {
    setRevisiTarget({
      originalText: rowContent,
      sectionType: 'table',
      tableRow: { rowIndex, tableStartIndex, tableEndIndex },
    });
    setRevisiModalOpen(true);
  };

  const handleRevisiSelection = () => {
    if (selectionRevisi) {
      setRevisiTarget({
        originalText: selectionRevisi,
        sectionType: 'concept',
      });
      setSelectionRevisi(null);
      setRevisiModalOpen(true);
    }
  };

  const handleRevisiConfirm = async (instruction: string) => {
    if (!revisiTarget || !onScriptChange) return;
    setIsRevising(true);
    try {
      const result = await reviseScriptPart(
        revisiTarget.originalText,
        instruction,
        revisiTarget.tableRow ? 'tableRow' : revisiTarget.sectionType
      );
      if (!result.success || !result.script) {
        toast.error(result.error || 'Gagal merevisi');
        throw new Error(result.error);
      }
      let newScript: string;
      if (revisiTarget.tableCell) {
        newScript = mergeTableCellRevision(script, {
          tableStartIndex: revisiTarget.tableCell.tableStartIndex,
          tableEndIndex: revisiTarget.tableCell.tableEndIndex,
          rowIndex: revisiTarget.tableCell.rowIndex,
          colIndex: revisiTarget.tableCell.colIndex,
          revisedCellValue: result.script,
        });
      } else if (revisiTarget.tableRow) {
        newScript = mergeTableRowRevision(script, {
          tableStartIndex: revisiTarget.tableRow.tableStartIndex,
          tableEndIndex: revisiTarget.tableRow.tableEndIndex,
          rowIndex: revisiTarget.tableRow.rowIndex,
          revisedRowMarkdown: result.script,
        });
      } else {
        newScript = mergeRevisedPart(
          script,
          revisiTarget.originalText,
          result.script,
          revisiTarget.startIndex,
          revisiTarget.endIndex
        );
      }
      if (newScript === script) {
        toast.error('Teks tidak ditemukan untuk diganti. Coba pilih ulang.');
        throw new Error('Replace failed');
      }
      onScriptChange(newScript);
      toast.success('Revisi berhasil');
      setRevisiModalOpen(false);
      setRevisiTarget(null);
    } catch {
      // Error handled above
    } finally {
      setIsRevising(false);
    }
  };

  const handleReframeConfirm = async (instruction: string) => {
    if (!onScriptChange) return;
    setIsRegenerating(true);
    try {
      const result = await regenerateScriptWithDifferentProblem(script, instruction);
      if (!result.success || !result.script) {
        toast.error(result.error || 'Gagal meregenerasi');
        throw new Error(result.error);
      }
      onScriptChange(result.script);
      toast.success('Script berhasil diregenerasi');
      setReframeModalOpen(false);
    } catch {
      // Error handled above
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString()?.trim();
    setSelectionRevisi(text || null);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">{t('scriptGenerator.aiResultTitle', 'Hasil Script dari AI (Gemini)')}</h3>
        <div className="flex gap-2 flex-nowrap overflow-x-auto seamless-scroll">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReframeModalOpen(true)}
            disabled={!script?.trim() || !onScriptChange || isRegenerating}
            title={t('scriptGenerator.reframe.button', 'Regenerate dengan masalah berbeda')}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('scriptGenerator.reframe.button', 'Regenerate dengan masalah berbeda')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSaveModalOpen(true)}
            disabled={!script?.trim()}
            title={t('scriptGenerator.saveToPlan', 'Simpan ke Plan')}
          >
            <Save className="h-4 w-4 mr-2" />
            {t('scriptGenerator.saveToPlan', 'Simpan ke Plan')}
          </Button>
        </div>
      </div>

      <ReframeModal
        open={reframeModalOpen}
        onClose={() => setReframeModalOpen(false)}
        onConfirm={handleReframeConfirm}
        isRegenerating={isRegenerating}
      />

      <SaveToPlanModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        script={script}
        formDataForPlan={formDataForPlan}
      />

      <RevisiModal
        open={revisiModalOpen}
        onClose={() => {
          setRevisiModalOpen(false);
          setRevisiTarget(null);
        }}
        originalText={revisiTarget?.originalText ?? ''}
        sectionLabel={revisiTarget ? SECTION_LABELS[revisiTarget.sectionType] : undefined}
        onConfirm={handleRevisiConfirm}
        isRevising={isRevising}
      />

      <div
        className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
        onMouseUp={handleMouseUp}
      >
        {selectionRevisi && onScriptChange && (
          <div className="sticky top-0 z-10 flex justify-center py-2 bg-primary/10 border-b">
            <Button size="sm" onClick={handleRevisiSelection}>
              {t('scriptGenerator.revisi.revisiSelection', 'Revisi selection')}
            </Button>
          </div>
        )}
        <div className={`p-4 ${PROSE_CLASS}`}>
          {segments.map((seg, idx) => {
            const slice = fullScript.slice(seg.start, seg.end);
            if (!slice.trim()) return null;
            if (seg.section?.type === 'table' && seg.section.tableData) {
              return (
                <RevisionTable
                  key={idx}
                  tableData={seg.section.tableData}
                  tableMarkdown={seg.section.content}
                  startIndex={seg.section.startIndex}
                  endIndex={seg.section.endIndex}
                  onRevisiCell={({ rowIndex, colIndex, value }) =>
                    handleRevisiTableCell(
                      rowIndex,
                      colIndex,
                      value,
                      seg.section!.startIndex,
                      seg.section!.endIndex
                    )
                  }
                  onRevisiRow={({ rowIndex, rowContent }) =>
                    handleRevisiTableRow(
                      rowIndex,
                      rowContent,
                      seg.section!.startIndex,
                      seg.section!.endIndex
                    )
                  }
                  onRevisiSection={handleRevisiTableSection}
                  disabled={!onScriptChange || isRevising}
                />
              );
            }
            if (seg.section && onScriptChange) {
              return (
                <RevisionSectionWrapper
                  key={idx}
                  sectionId={seg.section.id}
                  sectionType={seg.section.type}
                  content={seg.section.content}
                  onRevisi={handleRevisiSection}
                  disabled={isRevising}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                    {slice}
                  </ReactMarkdown>
                </RevisionSectionWrapper>
              );
            }
            return (
              <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                {slice}
              </ReactMarkdown>
            );
          })}
        </div>
      </div>
    </div>
  );
};
