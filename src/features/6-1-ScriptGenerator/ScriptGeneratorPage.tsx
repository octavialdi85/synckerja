import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StandardLayout } from '@/features/1-layouts/StandardLayout';
import { HeaderAndTab } from '../6-1-ContentCalendar/container/HeaderAndTab';
import { RealtimeSocialMediaProvider } from '@/features/6-1-dashboard/hook/RealtimeSocialMediaProvider';
import OptimizedErrorBoundary from '@/features/6-1-dashboard/OptimizedErrorBoundary';
import { PICFilterProvider } from '@/features/6-1-dashboard/PICFilterContext';
import { ScriptGeneratorForm } from './components/ScriptGeneratorForm';
import { ScriptResult } from './components/ScriptResult';
import { generateScript, ScriptGeneratorRequest } from './services/scriptGeneratorService';
import { toast } from 'sonner';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';

const ScriptGeneratorContent: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useAppTranslation();
  const [activeMainTab, setActiveMainTab] = useState('script-generator');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);

  const handleTabChange = (newTab: string) => {
    setActiveMainTab(newTab);
    navigate(`/digital-marketing/social-media/${newTab}`);
  };

  const handleGenerate = async (data: ScriptGeneratorRequest) => {
    setIsGenerating(true);
    setGeneratedScript(null);

    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
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

  return (
    <StandardLayout>
      <div className="min-h-screen bg-gray-100 flex flex-col font-sans relative">
        <div className="flex flex-1 min-h-0">
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0 px-4 pb-4">
            <div className="h-full flex flex-col overflow-hidden max-w-full">
              {/* Header and Tabs */}
              <div className="flex-shrink-0 mb-1">
                <HeaderAndTab 
                  activeMainTab={activeMainTab}
                  handleTabChange={handleTabChange}
                />
              </div>
              
              {/* Main Content Area */}
              <div className="flex-1 min-h-0 min-w-0">
                <div className="h-full bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col max-h-[calc(100vh-120px)] overflow-hidden">
                  {/* Scrollable Content Area */}
                  <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden seamless-scroll p-6">
                    <div className="max-w-4xl mx-auto space-y-6">
                      {/* Title */}
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Script Generator</h2>
                        <p className="text-sm text-gray-600">
                          Isi form di bawah untuk generate script konten digital marketing sesuai kebutuhan Anda
                        </p>
                      </div>

                      {/* Form and Result Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Form Section */}
                        <div className="space-y-4">
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <ScriptGeneratorForm
                              onGenerate={handleGenerate}
                              isGenerating={isGenerating}
                            />
                          </div>
                        </div>

                        {/* Result Section */}
                        <div className="space-y-4">
                          {generatedScript ? (
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <ScriptResult script={generatedScript} />
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 border-dashed text-center">
                              <p className="text-gray-500 text-sm">
                                Hasil prompt untuk ChatGPT akan muncul di sini setelah Anda mengisi form dan klik "Generate Script"
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
