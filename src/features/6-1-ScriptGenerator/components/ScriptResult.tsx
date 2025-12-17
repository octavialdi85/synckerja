import React from 'react';
import { Button } from '@/features/ui/button';
import { Copy, Download, Check, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ScriptResultProps {
  script: string;
  onGenerateGemini?: () => void;
  isGeneratingGemini?: boolean;
}

export const ScriptResult: React.FC<ScriptResultProps> = ({ 
  script, 
  onGenerateGemini,
  isGeneratingGemini = false 
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      toast.success('Prompt berhasil disalin ke clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Gagal menyalin prompt');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([script], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatgpt-prompt-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Prompt berhasil diunduh');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Generated Prompt untuk ChatGPT</h3>
        <div className="flex gap-2">
          {onGenerateGemini && (
            <Button
              variant="default"
              size="sm"
              onClick={onGenerateGemini}
              disabled={isGeneratingGemini}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGeneratingGemini ? 'Generating...' : 'Generate dengan Gemini'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-[600px] overflow-y-auto seamless-scroll">
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
          {script}
        </pre>
      </div>
    </div>
  );
};
