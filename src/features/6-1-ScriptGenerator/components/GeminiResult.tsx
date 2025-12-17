import React from 'react';
import { Button } from '@/features/ui/button';
import { Copy, Download, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface GeminiResultProps {
  content: string | null;
  isGenerating: boolean;
}

export const GeminiResult: React.FC<GeminiResultProps> = ({ content, isGenerating }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Hasil Gemini berhasil disalin ke clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Gagal menyalin hasil Gemini');
    }
  };

  const handleDownload = () => {
    if (!content) return;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-result-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Hasil Gemini berhasil diunduh');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Hasil Generate dari Gemini</h3>
        {content && (
          <div className="flex gap-2">
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
        )}
      </div>
      
      {isGenerating ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 flex flex-col items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
          <p className="text-gray-600 text-sm">Sedang generate menggunakan Gemini API...</p>
        </div>
      ) : content ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 max-h-[600px] overflow-y-auto seamless-scroll">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
            {content}
          </pre>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-8 border border-gray-200 border-dashed text-center">
          <p className="text-gray-500 text-sm">
            Hasil generate dari Gemini akan muncul di sini setelah prompt di-generate
          </p>
        </div>
      )}
    </div>
  );
};

