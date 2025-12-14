import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Label } from '@/features/ui/label';
import { Input } from '@/features/ui/input';
import { Textarea } from '@/features/ui/textarea';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { Palette } from 'lucide-react';
import { ProductKnowledgeStyle } from '../hooks/useProductKnowledgeStyle';

interface StyleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; description: string; structure?: string }) => Promise<void>;
  isLoading?: boolean;
  initialData?: ProductKnowledgeStyle | null;
}

export const StyleModal: React.FC<StyleModalProps> = ({
  open,
  onOpenChange,
  onSave,
  isLoading = false,
  initialData = null,
}) => {
  const { t } = useAppTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [structure, setStructure] = useState('');

  // Reset form when modal opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        // Edit mode - populate with existing data
        setName(initialData.name || '');
        setDescription(initialData.description || '');
        setStructure(initialData.structure || '');
      } else {
        // Create mode - reset form
        setName('');
        setDescription('');
        setStructure('');
      }
    } else {
      // Close modal - reset form
      setName('');
      setDescription('');
      setStructure('');
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return;
    }

    try {
      const saveData: { name: string; description: string; structure?: string } = {
        name: trimmedName,
        description: (description || '').trim(),
      };
      
      if (structure) {
        saveData.structure = structure.trim();
      }
      
      console.log('Saving style data:', saveData);
      await onSave(saveData);
      // Reset form after successful save
      setName('');
      setDescription('');
      setStructure('');
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error saving style:', error);
    }
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setStructure('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-gray-700" />
              {initialData
                ? t('productKnowledge.style.modal.editTitle', 'Edit Style')
                : t('productKnowledge.style.modal.title', 'Add New Style')}
            </DialogTitle>
            <DialogDescription>
              {initialData
                ? t(
                    'productKnowledge.style.modal.editDescription',
                    'Update the style information'
                  )
                : t(
                    'productKnowledge.style.modal.description',
                    'Create a new style for product knowledge content'
                  )}
            </DialogDescription>
          </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Style Name */}
            <div className="space-y-2">
              <Label htmlFor="style-name">
                {t('productKnowledge.style.modal.nameLabel', 'Style Name')} *
              </Label>
              <Input
                id="style-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('productKnowledge.style.modal.namePlaceholder', 'Enter style name')}
                disabled={isLoading}
                required
              />
            </div>

            {/* Style Description */}
            <div className="space-y-2">
              <Label htmlFor="style-description">
                {t('productKnowledge.style.modal.descriptionLabel', 'Description')}
              </Label>
              <Textarea
                id="style-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t(
                  'productKnowledge.style.modal.descriptionPlaceholder',
                  'Enter style description (optional)'
                )}
                disabled={isLoading}
                rows={4}
              />
            </div>

            {/* Style Structure */}
            <div className="space-y-2">
              <Label htmlFor="style-structure">
                {t('productKnowledge.style.modal.structureLabel', 'Structure')}
              </Label>
              <Textarea
                id="style-structure"
                value={structure}
                onChange={(e) => setStructure(e.target.value)}
                placeholder={t(
                  'productKnowledge.style.modal.structurePlaceholder',
                  'Enter style structure (optional)'
                )}
                disabled={isLoading}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              {t('productKnowledge.style.modal.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading
                ? t('productKnowledge.style.modal.saving', 'Saving...')
                : t('productKnowledge.style.modal.save', 'Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

