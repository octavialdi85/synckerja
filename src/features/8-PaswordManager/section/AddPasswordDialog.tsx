import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/features/ui/select';
import { Checkbox } from '@/features/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/features/ui/tabs';
import { Eye, EyeOff } from 'lucide-react';
import { Password, PasswordFormData } from '../types';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { PasswordGenerator } from './PasswordGenerator';

interface AddPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PasswordFormData) => void;
  editPassword?: Password | null;
  categories: Array<{ id: string; name: string }>;
}

export const AddPasswordDialog: React.FC<AddPasswordDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  editPassword,
  categories,
}) => {
  // Create empty form data as a constant
  const emptyFormData: PasswordFormData = useMemo(() => ({
    title: '',
    username: '',
    password: '',
    url: '',
    category: 'general',
    notes: '',
    isFavorite: false,
  }), []);

  const [formData, setFormData] = useState<PasswordFormData>(emptyFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Single useEffect to handle form initialization
  useEffect(() => {
    if (!open) {
      // Reset when dialog closes
      setFormData(emptyFormData);
      setShowPassword(false);
      setIsInitialized(false);
      return;
    }

    // Initialize form when dialog opens
    if (open && !isInitialized) {
      if (editPassword) {
        // Populate form when editing
        setFormData({
          title: editPassword.title,
          username: editPassword.username,
          password: editPassword.password,
          url: editPassword.url || '',
          category: editPassword.category,
          notes: editPassword.notes || '',
          isFavorite: editPassword.isFavorite,
        });
      } else {
        // Clear form for new password
        setFormData(emptyFormData);
      }
      setIsInitialized(true);
    }
  }, [open, editPassword, emptyFormData, isInitialized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleUseGeneratedPassword = (password: string) => {
    setFormData((prev) => ({ ...prev, password }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[680px] h-[720px] max-w-[95vw] max-h-[95vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold truncate">
                {editPassword ? 'Edit Password' : 'Add New Password'}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1 truncate">
                {editPassword
                  ? 'Update your password information below.'
                  : 'Fill in the details to save a new password.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 seamless-scroll">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="generator">Password Generator</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <form 
              id="password-form"
              onSubmit={handleSubmit} 
              className="space-y-4"
              autoComplete="off"
            >
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Gmail, Facebook, Work Email"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">
                  Username/Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="username or email@example.com"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="pr-10"
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {formData.password && <PasswordStrengthMeter password={formData.password} />}
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="favorite"
                  checked={formData.isFavorite}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isFavorite: checked as boolean })
                  }
                />
                <Label htmlFor="favorite" className="cursor-pointer">
                  Add to favorites
                </Label>
              </div>

            </form>
          </TabsContent>

          <TabsContent value="generator">
            <PasswordGenerator onUsePassword={handleUseGeneratedPassword} />
            <p className="text-sm text-muted-foreground mt-4">
              Switch to the Details tab to see the generated password in the form.
            </p>
          </TabsContent>
        </Tabs>
        </div>
        <DialogFooter className="px-6 pb-6 pt-4 flex-shrink-0 border-t bg-muted/30">
          <Button type="button" variant="outline" onClick={handleCancel} className="w-full md:w-auto">
            Cancel
          </Button>
          <Button form="password-form" type="submit" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
            {editPassword ? 'Update Password' : 'Save Password'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};



