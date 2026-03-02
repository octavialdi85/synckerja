import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '../6-1-ContentCalendar/container/HeaderAndTab';
import { RealtimeSocialMediaProvider } from '@/features/6-1-dashboard/hook/RealtimeSocialMediaProvider';
import OptimizedErrorBoundary from '@/features/6-1-dashboard/OptimizedErrorBoundary';
import { PICFilterProvider } from '@/features/6-1-dashboard/PICFilterContext';
import { ScriptGeneratorForm } from './components/ScriptGeneratorForm';
import { ScriptResult } from './components/ScriptResult';
import { AIScriptResult } from './components/AIScriptResult';
import { generateScript, ScriptGeneratorRequest } from './services/scriptGeneratorService';
import { generateScriptWithAI } from './services/scriptGeneratorAIService';
import { toast } from 'sonner';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { useScriptAIConfig } from './hooks/useScriptAIConfig';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';

const SCRIPT_GENERATOR_DRAFT_KEY_PREFIX = 'synckerja-script-generator-draft';

function getDraftKey(organizationId: string): string {
  return `${SCRIPT_GENERATOR_DRAFT_KEY_PREFIX}-${organizationId}`;
}

type DraftState = {
  generatedPrompt: string | null;
  aiGeneratedScript: string | null;
  lastFormDataForPlan: { content_type_id?: string; service_id?: string; sub_service_id?: string; content_pillar_id?: string } | null;
  formPanelHidden: boolean;
};

function loadDraft(organizationId: string | null | undefined): DraftState | null {
  if (!organizationId || typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(getDraftKey(organizationId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftState;
    if (!parsed || (typeof parsed.generatedPrompt !== 'string' && parsed.generatedPrompt !== null)) return null;
    if (typeof parsed.aiGeneratedScript !== 'string' && parsed.aiGeneratedScript !== null) return null;
    return {
      generatedPrompt: parsed.generatedPrompt ?? null,
      aiGeneratedScript: parsed.aiGeneratedScript ?? null,
      lastFormDataForPlan: parsed.lastFormDataForPlan && typeof parsed.lastFormDataForPlan === 'object' ? parsed.lastFormDataForPlan : null,
      formPanelHidden: !!parsed.formPanelHidden,
    };
  } catch {
    return null;
  }
}

function saveDraft(state: DraftState, organizationId: string | null | undefined) {
  if (!organizationId || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(getDraftKey(organizationId), JSON.stringify(state));
  } catch {
    // ignore
  }
}

const ScriptGeneratorContent: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const { organizationId } = useCurrentOrg();
  const draftAppliedRef = useRef(false);
  const [activeMainTab, setActiveMainTab] = useState('script-generator');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [aiGeneratedScript, setAiGeneratedScript] = useState<string | null>(null);
  const [lastFormDataForPlan, setLastFormDataForPlan] = useState<{
    content_type_id?: string;
    service_id?: string;
    sub_service_id?: string;
    content_pillar_id?: string;
  } | null>(null);
  const [formPanelHidden, setFormPanelHidden] = useState(false);
  const { data: aiConfig, isLoading: aiConfigLoading, isError: aiConfigError, refetch: refetchAiConfig } = useScriptAIConfig();
  // Use draft synchronously for first paint when org is ready but effect hasn't run yet (removes refresh flicker)
  const draftForPaint = organizationId && !draftAppliedRef.current ? loadDraft(organizationId) : null;
  const effectiveGeneratedPrompt = draftForPaint !== null ? draftForPaint.generatedPrompt : generatedPrompt;
  const effectiveAiGeneratedScript = draftForPaint !== null ? draftForPaint.aiGeneratedScript : aiGeneratedScript;
  const effectiveLastFormDataForPlan = draftForPaint !== null ? draftForPaint.lastFormDataForPlan : lastFormDataForPlan;
  const effectiveFormPanelHidden = draftForPaint !== null ? draftForPaint.formPanelHidden : formPanelHidden;

  // Saat organisasi berubah (termasuk pertama kali load): muat draft untuk org tersebut; isolasi data per org
  useEffect(() => {
    if (!organizationId) {
      draftAppliedRef.current = false;
      setGeneratedPrompt(null);
      setAiGeneratedScript(null);
      setLastFormDataForPlan(null);
      setFormPanelHidden(false);
      return;
    }
    const draft = loadDraft(organizationId);
    setGeneratedPrompt(draft?.generatedPrompt ?? null);
    setAiGeneratedScript(draft?.aiGeneratedScript ?? null);
    setLastFormDataForPlan(draft?.lastFormDataForPlan ?? null);
    setFormPanelHidden(draft?.formPanelHidden ?? false);
    draftAppliedRef.current = true;
  }, [organizationId]);

  // Simpan draft ke sessionStorage per organisasi (hanya bila org aktif)
  useEffect(() => {
    if (!organizationId) return;
    saveDraft(
      {
        generatedPrompt,
        aiGeneratedScript,
        lastFormDataForPlan,
        formPanelHidden,
      },
      organizationId
    );
  }, [organizationId, generatedPrompt, aiGeneratedScript, lastFormDataForPlan, formPanelHidden]);

  const handleTabChange = (newTab: string) => {
    setActiveMainTab(newTab);
    navigate(`/digital-marketing/social-media/${newTab}`);
  };

  const handleGenerate = async (data: ScriptGeneratorRequest) => {
    setIsGenerating(true);
    setGeneratedPrompt(null);
    setAiGeneratedScript(null);
    // Store form data for Save to Plan auto-fill
    setLastFormDataForPlan({
      content_type_id: data.content_type_id,
      service_id: data.service_id,
      sub_service_id: data.sub_service_id,
      content_pillar_id: data.content_pillar_id,
    });

    try {
      const result = await generateScript(data);

      if (result.success && result.script) {
        setGeneratedPrompt(result.script);
        toast.success('Prompt berhasil di-generate!');
      } else {
        toast.error(result.error || 'Gagal generate prompt');
      }
    } catch (error) {
      console.error('Error generating script:', error);
      toast.error('Terjadi error saat generate prompt');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWithAI = async (prompt: string) => {
    if (!prompt.trim()) {
      toast.error('Prompt kosong');
      return;
    }
    if (!aiConfig?.is_active || !aiConfig?.api_key_configured) {
      toast.error(t('scriptGenerator.settings.configNotFound', 'Script AI belum dikonfigurasi. Buka Settings > Script AI Generator.'));
      return;
    }

    setIsGeneratingAI(true);
    setAiGeneratedScript(null);

    try {
      const result = await generateScriptWithAI(prompt);

      if (result.success && result.script) {
        setAiGeneratedScript(result.script);
        setFormPanelHidden(true);
        toast.success('Script berhasil di-generate oleh AI!');
      } else {
        toast.error(result.error || 'Gagal generate script dengan AI');
      }
    } catch (error) {
      console.error('Error generating script with AI:', error);
      toast.error('Terjadi error saat generate script dengan AI');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 px-4 pb-4 overflow-hidden">
            <div className="h-full flex flex-col overflow-hidden max-w-full">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeMainTab={activeMainTab}
                  handleTabChange={handleTabChange}
                />
              </div>

              {/* Grid: 3 kolom saat form visible; 2 kolom full width saat form hidden */}
              <div className="flex-1 min-h-0 overflow-hidden w-full min-w-0">
                <div className={`grid gap-2 flex-1 min-h-0 h-full w-full min-w-0 overflow-hidden ${effectiveFormPanelHidden ? 'grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)]' : 'grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.33fr)]'}`}>
                  {/* Panel 1: Form — tidak di-render saat hidden agar 2 kolom (Prompt+AI) full width */}
                  {!effectiveFormPanelHidden && (
                  <div className="flex flex-col min-h-0 overflow-hidden min-w-0">
                    <div className="flex-1 min-h-0 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center">
                        <button
                          type="button"
                          onClick={() => setFormPanelHidden(true)}
                          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-md transition-colors"
                          title={t('scriptGenerator.hideForm', 'Sembunyikan form')}
                        >
                          <PanelLeftClose className="h-4 w-4" />
                          {t('scriptGenerator.hideForm', 'Sembunyikan Form')}
                        </button>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain max-h-[calc(100vh-180px)] min-w-0">
                        <div className="p-4 w-full min-w-0">
                          <ScriptGeneratorForm
                            onGenerate={handleGenerate}
                            isGenerating={isGenerating}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Panel 2: Prompt (QC + Generate dengan AI) — 3fr (30%) full width saat form hidden */}
                  <div className="flex flex-col min-h-0 overflow-hidden min-w-0">
                    <div className="flex-1 min-h-0 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      {effectiveFormPanelHidden && (
                        <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center">
                          <button
                            type="button"
                            onClick={() => setFormPanelHidden(false)}
                            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-md transition-colors"
                            title={t('scriptGenerator.showForm', 'Tampilkan form')}
                          >
                            <PanelLeftOpen className="h-4 w-4" />
                            {t('scriptGenerator.showForm', 'Tampilkan Form')}
                          </button>
                        </div>
                      )}
                      <div className={effectiveGeneratedPrompt
                        ? "flex-1 min-h-0 flex flex-col overflow-hidden p-4 min-w-0"
                        : "flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain max-h-[calc(100vh-180px)] min-w-0"
                      }>
                        {effectiveGeneratedPrompt ? (
                          <div className="flex flex-col flex-1 min-h-0 gap-2">
                            {!aiConfig?.is_active || !aiConfig?.api_key_configured ? (
                              <div className="flex-shrink-0 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-2 flex-wrap">
                                <span className="text-sm text-amber-800">
                                  {aiConfigLoading && 'Memuat konfigurasi AI...'}
                                  {!aiConfigLoading && aiConfigError && 'Gagal memuat konfigurasi. Coba refresh.'}
                                  {!aiConfigLoading && !aiConfigError && !aiConfig && (
                                    <>
                                      Konfigurasi AI tidak ditemukan. Pastikan organisasi aktif benar (jika punya banyak org). Lalu buka{' '}
                                      <Link to="/digital-marketing/social-media/settings" className="text-amber-700 hover:text-amber-900 font-medium underline">
                                        Settings → Script AI Generator
                                      </Link>
                                      .
                                    </>
                                  )}
                                  {!aiConfigLoading && !aiConfigError && aiConfig && !aiConfig.api_key_configured && 'API key belum dikonfigurasi di Settings.'}
                                  {!aiConfigLoading && !aiConfigError && aiConfig && !aiConfig.is_active && 'Enable AI dimatikan di Settings.'}
                                </span>
                                {!aiConfigLoading && (
                                  <button
                                    type="button"
                                    onClick={() => refetchAiConfig()}
                                    className="text-sm text-amber-700 hover:text-amber-900 font-medium underline"
                                  >
                                    Refresh konfigurasi
                                  </button>
                                )}
                              </div>
                            ) : null}
                            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                              <ScriptResult
                                script={effectiveGeneratedPrompt}
                                onGenerateWithAI={handleGenerateWithAI}
                                isGeneratingAI={isGeneratingAI}
                                isAIConfigured={!!(aiConfig?.is_active && aiConfig?.api_key_configured)}
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 w-full min-w-0">
                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 border-dashed text-center min-h-[200px] flex items-center justify-center">
                              <p className="text-gray-500 text-sm">
                                Prompt akan muncul di sini setelah Anda mengisi form dan klik &quot;Generate Script&quot;
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Panel 3: AI Result — 70% saat form hidden, 40% saat 3 panel */}
                  <div className="flex flex-col min-h-0 overflow-hidden min-w-0">
                    <div className="flex-1 min-h-0 flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll nested-scroll-touch-chain max-h-[calc(100vh-180px)] min-w-0">
                        <div className="px-4 pt-4 pb-4 w-full min-w-0">
                          {effectiveAiGeneratedScript ? (
                            <AIScriptResult
                              script={effectiveAiGeneratedScript}
                              formDataForPlan={effectiveLastFormDataForPlan}
                              onScriptChange={setAiGeneratedScript}
                            />
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 border-dashed text-center min-h-[200px] flex items-center justify-center">
                              <p className="text-gray-500 text-sm">
                                {t('scriptGenerator.aiEmptyState', 'Hasil script dari AI akan muncul di sini setelah Anda QC prompt di panel tengah dan klik "Generate dengan AI"')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StandardLayout>
  );
};

// Main export with providers
const ScriptGeneratorPage = () => {
  return (
    <OptimizedErrorBoundary>
      <RealtimeSocialMediaProvider>
        <PICFilterProvider>
          <ScriptGeneratorContent />
        </PICFilterProvider>
      </RealtimeSocialMediaProvider>
    </OptimizedErrorBoundary>
  );
};

export default ScriptGeneratorPage;
