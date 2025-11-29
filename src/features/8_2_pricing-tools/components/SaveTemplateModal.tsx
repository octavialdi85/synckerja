import { useState } from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/features/ui/dialog';
import { Save, Loader2 } from 'lucide-react';
import { usePricingTemplates } from '../hooks/usePricingTemplates';
import { PricingCalculationInput } from '../types/pricingTypes';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { toast } from 'sonner';

interface SaveTemplateModalProps {
  calculationInput: PricingCalculationInput | null;
  disabled?: boolean;
}

export const SaveTemplateModal = ({ calculationInput, disabled }: SaveTemplateModalProps) => {
  const { t } = useAppTranslation();
  const { saveTemplate } = usePricingTemplates();
  const [isOpen, setIsOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [category, setCategory] = useState('');

  const handleSave = async () => {
    if (!calculationInput || !templateName.trim()) {
      return;
    }

    try {
      await saveTemplate.mutateAsync({
        template_name: templateName.trim(),
        template_description: templateDescription.trim() || null,
        category: category.trim() || null,
        template_data: calculationInput,
      });

      toast.success('Template saved successfully');
      setIsOpen(false);
      setTemplateName('');
      setTemplateDescription('');
      setCategory('');
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast.error(error.message || 'Failed to save template');
    }
  };

  const isFormValid = templateName.trim().length > 0 && calculationInput !== null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || !calculationInput}>
          <Save className="h-4 w-4 mr-2" />
          {t('pricingTools.templates.save', 'Save as Template')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('pricingTools.templates.save.title', 'Save Template')}</DialogTitle>
          <DialogDescription>
            {t('pricingTools.templates.save.description', 'Save current configuration as a template for future use')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="template-name">
              {t('pricingTools.templates.save.name', 'Template Name')} *
            </Label>
            <Input
              id="template-name"
              placeholder="e.g., Parfum Import - Basic Setup"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="template-description">
              {t('pricingTools.templates.save.description.label', 'Template Description')}
            </Label>
            <Textarea
              id="template-description"
              placeholder="Brief description of this template..."
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="template-category">
              {t('pricingTools.templates.save.category', 'Category')}
            </Label>
            <Input
              id="template-category"
              placeholder="e.g., Parfum Import, Food & Beverage"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsOpen(false);
              setTemplateName('');
              setTemplateDescription('');
              setCategory('');
            }}
            disabled={saveTemplate.isPending}
          >
            {t('pricingTools.templates.save.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!isFormValid || saveTemplate.isPending}
          >
            {saveTemplate.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              t('pricingTools.templates.save.save', 'Save')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

