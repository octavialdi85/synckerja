import React, { useState } from 'react';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/features/ui/dialog';
import { Textarea } from '@/features/ui/textarea';
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/features/ui/use-toast';
import { KPITemplate, TemplateCategory, CalculatorType, TEMPLATE_CATEGORIES, ServiceKPISettings, SalesKPISettings } from '../../../8-3-CampaignCalculator/types/kpi-templates';
import { supabase } from '@/integrations/supabase/client';
import { useCentralizedUserData } from '@/features/1-login/contexts/CentralizedUserDataContext';

interface SaveTemplateModalProps {
  calculatorType: CalculatorType;
  currentSettings: ServiceKPISettings | SalesKPISettings;
  onSaveSuccess?: () => void;
  onSaveTemplate?: (template: Omit<KPITemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'>) => void;
}

export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({
  calculatorType,
  currentSettings,
  onSaveSuccess,
  onSaveTemplate
}) => {
  const { toast } = useToast();
  const { userData } = useCentralizedUserData();
  const organizationId = userData?.active_organization_id ?? null;
  const userId = userData?.user_id ?? null;

  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: '',
    category: '' as TemplateCategory,
    is_public: false
  });

  const handleSaveTemplate = async () => {
    if (!saveForm.name || !saveForm.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!organizationId || !userId) {
      toast({
        title: "Organization Required",
        description: "Please select an active organization before saving templates.",
        variant: "destructive"
      });
      return;
    }

    const templatePayload: Omit<KPITemplate, 'id' | 'created_at' | 'updated_at' | 'usage_count'> = {
      name: saveForm.name,
      description: saveForm.description,
      category: saveForm.category,
      type: calculatorType,
      settings: currentSettings,
      created_by: userId,
      organization_id: organizationId ?? undefined,
      is_public: saveForm.is_public
    };

    setIsSavingTemplate(true);
    const { data, error } = await supabase
      .from('campaign_kpi_templates')
      .insert({
        name: templatePayload.name,
        description: templatePayload.description,
        category: templatePayload.category,
        type: templatePayload.type,
        settings: templatePayload.settings,
        is_public: templatePayload.is_public,
        organization_id: organizationId,
        created_by: userId
      })
      .select()
      .single();
    setIsSavingTemplate(false);

    if (error) {
      console.error('Error saving KPI template:', error);
      toast({
        title: "Failed to save template",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
      return;
    }

    setIsSaveDialogOpen(false);
    setSaveForm({ name: '', description: '', category: '' as TemplateCategory, is_public: false });
    
    toast({
      title: "Template Saved",
      description: `KPI template "${saveForm.name}" has been saved successfully`
    });

    if (onSaveTemplate) {
      onSaveTemplate(templatePayload);
    }

    if (onSaveSuccess) {
      onSaveSuccess();
    }
  };

  return (
    <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Save className="h-4 w-4 mr-2" />
          Save Template
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[520px] h-[560px] max-w-[95vw] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Save className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-semibold truncate">
                Save KPI Template
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1 truncate">
                Store your current KPI calculator settings for quick reuse.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          <div>
            <Label htmlFor="template-name">Template Name *</Label>
            <Input
              id="template-name"
              value={saveForm.name}
              onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Healthcare Patient Acquisition"
            />
          </div>
          
          <div>
            <Label htmlFor="template-category">Category *</Label>
            <Select
              value={saveForm.category}
              onValueChange={(value: TemplateCategory) => setSaveForm(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger id="template-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(calculatorType === 'services' ? TEMPLATE_CATEGORIES.services : TEMPLATE_CATEGORIES.sales).map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div>
                      <div className="font-medium">{cat.label}</div>
                      <div className="text-xs text-gray-500">{cat.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={saveForm.description}
              onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe when to use this template..."
              rows={3}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is-public"
              checked={saveForm.is_public}
              onChange={(e) => setSaveForm(prev => ({ ...prev, is_public: e.target.checked }))}
              className="rounded"
            />
            <Label htmlFor="is-public" className="text-sm">
              Share with team (make template public)
            </Label>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 pt-4 flex-shrink-0 border-t bg-muted/30">
          <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)} className="w-full md:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSaveTemplate} disabled={isSavingTemplate} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
            {isSavingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

