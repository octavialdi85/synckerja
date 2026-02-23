import React from 'react';
import { Button } from '@/features/ui/button';
import { Copy, Download, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ScriptResultProps {
  script: string;
}

export const ScriptResult: React.FC<ScriptResultProps> = ({ 
  script
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
      
      {/* Rule 3.4: satu scroll per panel — scroll hanya di container sidebar, tidak nested di sini */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
          {script}
        </pre>
      </div>
    </div>
  );
};
