import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '../6-1-ContentCalendar/container/HeaderAndTab';
import { RealtimeSocialMediaProvider } from '@/features/6-1-dashboard/hook/RealtimeSocialMediaProvider';
import OptimizedErrorBoundary from '@/features/6-1-dashboard/OptimizedErrorBoundary';
import { PICFilterProvider } from '@/features/6-1-dashboard/PICFilterContext';
import { ScriptGeneratorForm } from './components/ScriptGeneratorForm';
import { ScriptResult } from './components/ScriptResult';
import { GeminiResult } from './components/GeminiResult';
import { generateScript, ScriptGeneratorRequest } from './services/scriptGeneratorService';
import { generateWithGemini } from './services/geminiService';
import { toast } from 'sonner';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

const ScriptGeneratorContent: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const [activeMainTab, setActiveMainTab] = useState('script-generator');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingGemini, setIsGeneratingGemini] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [geminiResult, setGeminiResult] = useState<string | null>(null);

  const handleTabChange = (newTab: string) => {
    setActiveMainTab(newTab);
    navigate(`/digital-marketing/social-media/${newTab}`);
  };

  const handleGenerate = async (data: ScriptGeneratorRequest) => {
    setIsGenerating(true);
    setGeneratedScript(null);
    setGeminiResult(null);

    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      // Generate ChatGPT prompt
      const result = await generateScript(data);

      if (result.success && result.script) {
        setGeneratedScript(result.script);
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

  const handleGenerateGemini = async () => {
    if (!generatedScript) {
      toast.error('Prompt belum di-generate. Silakan generate prompt terlebih dahulu.');
      return;
    }

    setIsGeneratingGemini(true);
    setGeminiResult(null);

    try {
      const geminiResponse = await generateWithGemini(generatedScript);
      
      if (geminiResponse.success && geminiResponse.content) {
        setGeminiResult(geminiResponse.content);
        toast.success('Hasil Gemini berhasil di-generate!');
      } else {
        toast.error(geminiResponse.error || 'Gagal generate dengan Gemini API');
      }
    } catch (geminiError) {
      console.error('Error generating with Gemini:', geminiError);
      toast.error('Terjadi error saat generate dengan Gemini API');
    } finally {
      setIsGeneratingGemini(false);
    }
  };

  return (
    <StandardLayout>
      <div className="min-h-screen max-h-screen bg-gray-100 flex flex-col font-sans relative overflow-hidden">
        <div className="flex flex-1 min-h-0 overflow-hidden">
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
              
              {/* Main Content Area */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col overflow-hidden">
                  {/* Scrollable Content Area */}
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll max-h-[calc(100vh-120px)]">
                    <div className="p-6 w-full min-w-0">
                      <div className="space-y-6">
                        {/* Form and Result Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Form Section */}
                          <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <ScriptGeneratorForm
                                onGenerate={handleGenerate}
                                isGenerating={isGenerating}
                              />
                            </div>
                          </div>

                          {/* ChatGPT Prompt Result Section */}
                          <div className="space-y-4">
                            {generatedScript ? (
                              <div className="bg-white rounded-lg p-4 border border-gray-200 h-full">
                                <ScriptResult 
                                  script={generatedScript}
                                  onGenerateGemini={handleGenerateGemini}
                                  isGeneratingGemini={isGeneratingGemini}
                                />
                              </div>
                            ) : (
                              <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 border-dashed text-center h-full flex items-center justify-center">
                                <p className="text-gray-500 text-sm">
                                  Hasil prompt untuk ChatGPT akan muncul di sini setelah Anda mengisi form dan klik "Generate Script"
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Gemini Result Section */}
                          <div className="space-y-4">
                            <div className="bg-white rounded-lg p-4 border border-gray-200 h-full">
                              <GeminiResult 
                                content={geminiResult} 
                                isGenerating={isGeneratingGemini}
                              />
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
