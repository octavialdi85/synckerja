import React, { useState } from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Checkbox } from '@/features/ui/checkbox';
import { Slider } from '@/features/ui/slider';
import { RefreshCw, Copy, Check } from 'lucide-react';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';

interface PasswordGeneratorProps {
  onUsePassword?: (password: string) => void;
}

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({ onUsePassword }) => {
  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let chars = '';
    if (includeUppercase) chars += uppercase;
    if (includeLowercase) chars += lowercase;
    if (includeNumbers) chars += numbers;
    if (includeSymbols) chars += symbols;

    if (chars === '') chars = lowercase;

    let generatedPassword = '';
    for (let i = 0; i < length; i++) {
      generatedPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    setPassword(generatedPassword);
    setCopied(false);
  };

  const copyToClipboard = async () => {
    if (password) {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  React.useEffect(() => {
    generatePassword();
  }, [length, includeUppercase, includeLowercase, includeNumbers, includeSymbols]);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <h3 className="font-semibold text-lg">Password Generator</h3>
      
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input value={password} readOnly className="font-mono" />
          <Button
            variant="outline"
            size="icon"
            onClick={copyToClipboard}
            title="Copy to clipboard"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={generatePassword}
            title="Generate new password"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        {password && <PasswordStrengthMeter password={password} />}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label>Length: {length}</Label>
          </div>
          <Slider
            value={[length]}
            onValueChange={(value) => setLength(value[0])}
            min={8}
            max={32}
            step={1}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="uppercase"
              checked={includeUppercase}
              onCheckedChange={(checked) => setIncludeUppercase(checked as boolean)}
            />
            <Label htmlFor="uppercase" className="cursor-pointer">
              Uppercase (A-Z)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="lowercase"
              checked={includeLowercase}
              onCheckedChange={(checked) => setIncludeLowercase(checked as boolean)}
            />
            <Label htmlFor="lowercase" className="cursor-pointer">
              Lowercase (a-z)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="numbers"
              checked={includeNumbers}
              onCheckedChange={(checked) => setIncludeNumbers(checked as boolean)}
            />
            <Label htmlFor="numbers" className="cursor-pointer">
              Numbers (0-9)
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="symbols"
              checked={includeSymbols}
              onCheckedChange={(checked) => setIncludeSymbols(checked as boolean)}
            />
            <Label htmlFor="symbols" className="cursor-pointer">
              Symbols (!@#$...)
            </Label>
          </div>
        </div>
      </div>

      {onUsePassword && (
        <Button onClick={() => onUsePassword(password)} className="w-full">
          Use This Password
        </Button>
      )}
    </div>
  );
};



