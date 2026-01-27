import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Textarea } from '@/features/ui/textarea';
import { Switch } from '@/features/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useKOLPaymentTerms } from '../hooks/useKOLPaymentTerms';

interface PaymentTermModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentTerm?: any;
}

export const PaymentTermModal = ({ isOpen, onClose, paymentTerm }: PaymentTermModalProps) => {
  const { createPaymentTerm, updatePaymentTerm } = useKOLPaymentTerms();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    type: 'template',
    template_name: '',
    payment_model: 'fixed',
    currency: 'IDR',
    base_amount: '',
    bonus_amount: '',
    barter_value: '',
    payment_schedule: 'net_30',
    terms_and_conditions: '',
    status: 'draft',
    performance_thresholds: {},
    bonus_conditions: {},
    effective_start_date: '',
    effective_end_date: '',
    campaign_id: null,
    kol_profile_id: null,
  });

  const [performanceThresholds, setPerformanceThresholds] = useState([
    { metric: 'reach', threshold: '', bonus_percentage: '' }
  ]);

  const [milestones, setMilestones] = useState([
    { name: '', percentage: '', due_date: '', description: '' }
  ]);

  useEffect(() => {
    if (paymentTerm) {
      setFormData({
        type: paymentTerm.type || 'agreement',
        template_name: paymentTerm.template_name || '',
        payment_model: paymentTerm.payment_model || 'milestone',
        currency: paymentTerm.currency || 'IDR',
        base_amount: paymentTerm.base_amount?.toString() || '',
        bonus_amount: paymentTerm.bonus_amount?.toString() || '',
        barter_value: paymentTerm.barter_value?.toString() || '',
        payment_schedule: paymentTerm.payment_schedule || 'net_30',
        terms_and_conditions: paymentTerm.terms_and_conditions || '',
        status: paymentTerm.status || 'active',
        performance_thresholds: paymentTerm.performance_thresholds || {},
        bonus_conditions: paymentTerm.bonus_conditions || {},
        effective_start_date: paymentTerm.effective_start_date || '',
        effective_end_date: paymentTerm.effective_end_date || '',
        campaign_id: paymentTerm.campaign_id || null,
        kol_profile_id: paymentTerm.kol_profile_id || null,
      });

      if (paymentTerm.performance_thresholds) {
        const thresholds = Object.entries(paymentTerm.performance_thresholds).map(([metric, data]: [string, any]) => ({
          metric,
          threshold: data.threshold?.toString() || '',
          bonus_percentage: data.bonus_percentage?.toString() || ''
        }));
        setPerformanceThresholds(thresholds.length > 0 ? thresholds : [{ metric: 'reach', threshold: '', bonus_percentage: '' }]);
      }
    } else {
      setFormData({
        type: 'template',
        template_name: '',
        payment_model: 'milestone',
        currency: 'IDR',
        base_amount: '',
        bonus_amount: '',
        barter_value: '',
        payment_schedule: 'net_30',
        terms_and_conditions: '',
        status: 'active',
        performance_thresholds: {},
        bonus_conditions: {},
        effective_start_date: '',
        effective_end_date: '',
        campaign_id: null,
        kol_profile_id: null,
      });
      setPerformanceThresholds([{ metric: 'reach', threshold: '', bonus_percentage: '' }]);
      setMilestones([{ name: '', percentage: '', due_date: '', description: '' }]);
    }
  }, [paymentTerm, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Convert performance thresholds to object format
      const thresholdsObj = performanceThresholds.reduce((acc, threshold) => {
        if (threshold.metric && threshold.threshold && threshold.bonus_percentage) {
          acc[threshold.metric] = {
            threshold: parseFloat(threshold.threshold),
            bonus_percentage: parseFloat(threshold.bonus_percentage)
          };
        }
        return acc;
      }, {} as any);

      const milestonesData = milestones.filter(m => m.name && m.percentage).map(m => ({
        ...m,
        percentage: parseFloat(m.percentage)
      }));

      const submitData = {
        ...formData,
        base_amount: formData.base_amount ? parseFloat(formData.base_amount) : null,
        bonus_amount: formData.bonus_amount ? parseFloat(formData.bonus_amount) : null,
        barter_value: formData.barter_value ? parseFloat(formData.barter_value) : null,
        performance_thresholds: thresholdsObj,
        milestones: milestonesData,
        effective_start_date: formData.effective_start_date || null,
        effective_end_date: formData.effective_end_date || null,
      };

      if (paymentTerm) {
        await updatePaymentTerm(paymentTerm.id, submitData);
      } else {
        await createPaymentTerm(submitData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving payment term:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPerformanceThreshold = () => {
    setPerformanceThresholds([...performanceThresholds, { metric: '', threshold: '', bonus_percentage: '' }]);
  };

  const removePerformanceThreshold = (index: number) => {
    setPerformanceThresholds(performanceThresholds.filter((_, i) => i !== index));
  };

  const updatePerformanceThreshold = (index: number, field: string, value: string) => {
    const updated = [...performanceThresholds];
    updated[index] = { ...updated[index], [field]: value };
    setPerformanceThresholds(updated);
  };

  const addMilestone = () => {
    setMilestones([...milestones, { name: '', percentage: '', due_date: '', description: '' }]);
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, field: string, value: string) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const validateMilestones = () => {
    const totalPercentage = milestones
      .filter(m => m.name && m.percentage)
      .reduce((sum, m) => sum + parseFloat(m.percentage || '0'), 0);
    return { isValid: totalPercentage === 100, totalPercentage };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Sticky Header */}
        <DialogHeader className="sticky top-0 bg-background z-10 pb-4 pt-6 px-6 border-b flex-shrink-0">
          <DialogTitle>
            {paymentTerm ? 'Edit Payment Term' : 'Create Payment Term'}
          </DialogTitle>
          <DialogDescription>
            {paymentTerm 
              ? 'Update payment term details, thresholds, and milestones.'
              : 'Create a new payment term with performance thresholds and payment milestones for KOL collaboration.'}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto seamless-scroll px-6 pt-4">
          <form id="payment-term-form" onSubmit={handleSubmit} className="space-y-6 pb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="template">Template</SelectItem>
                  <SelectItem value="agreement">Agreement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.type === 'template' && (
              <div>
                <Label htmlFor="template_name">Template Name *</Label>
                <Input
                  id="template_name"
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  placeholder="Standard KOL Template"
                  required={formData.type === 'template'}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_model">Payment Model *</Label>
              <Select value={formData.payment_model} onValueChange={(value) => setFormData({ ...formData, payment_model: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Fee</SelectItem>
                  <SelectItem value="fixed_plus_bonus">Fixed + Bonus</SelectItem>
                  <SelectItem value="performance_based">Performance Based</SelectItem>
                  <SelectItem value="tiered">Tiered</SelectItem>
                  <SelectItem value="barter_plus_fee">Barter + Fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="base_amount">Base Amount</Label>
              <Input
                id="base_amount"
                type="number"
                value={formData.base_amount}
                onChange={(e) => setFormData({ ...formData, base_amount: e.target.value })}
                placeholder="5000000"
              />
            </div>
            <div>
              <Label htmlFor="bonus_amount">Bonus Amount</Label>
              <Input
                id="bonus_amount"
                type="number"
                value={formData.bonus_amount}
                onChange={(e) => setFormData({ ...formData, bonus_amount: e.target.value })}
                placeholder="1000000"
              />
            </div>
            <div>
              <Label htmlFor="barter_value">Barter Value</Label>
              <Input
                id="barter_value"
                type="number"
                value={formData.barter_value}
                onChange={(e) => setFormData({ ...formData, barter_value: e.target.value })}
                placeholder="500000"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_schedule">Payment Schedule</Label>
              <Select value={formData.payment_schedule} onValueChange={(value) => setFormData({ ...formData, payment_schedule: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="net_30">Net 30</SelectItem>
                  <SelectItem value="net_15">Net 15</SelectItem>
                  <SelectItem value="net_7">Net 7</SelectItem>
                  <SelectItem value="immediate">Immediate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="negotiating">Negotiating</SelectItem>
                  <SelectItem value="agreed">Agreed</SelectItem>
                  <SelectItem value="signed">Signed</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="terms_and_conditions">Terms and Conditions</Label>
            <Textarea
              id="terms_and_conditions"
              value={formData.terms_and_conditions}
              onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
              placeholder="Enter terms and conditions..."
              rows={3}
            />
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Performance Thresholds</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addPerformanceThreshold}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Threshold
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {performanceThresholds.map((threshold, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label>Metric</Label>
                    <Select 
                      value={threshold.metric} 
                      onValueChange={(value) => updatePerformanceThreshold(index, 'metric', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select metric" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reach">Reach</SelectItem>
                        <SelectItem value="engagement">Engagement</SelectItem>
                        <SelectItem value="conversions">Conversions</SelectItem>
                        <SelectItem value="views">Views</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label>Threshold</Label>
                    <Input
                      type="number"
                      value={threshold.threshold}
                      onChange={(e) => updatePerformanceThreshold(index, 'threshold', e.target.value)}
                      placeholder="100000"
                    />
                  </div>
                  <div className="flex-1">
                    <Label>Bonus %</Label>
                    <Input
                      type="number"
                      value={threshold.bonus_percentage}
                      onChange={(e) => updatePerformanceThreshold(index, 'bonus_percentage', e.target.value)}
                      placeholder="10"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePerformanceThreshold(index)}
                    disabled={performanceThresholds.length === 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {formData.payment_model === 'milestone' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base">Payment Milestones</CardTitle>
                    {milestones.some(m => m.name && m.percentage) && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          validateMilestones().isValid 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          Total: {validateMilestones().totalPercentage}%
                          {validateMilestones().isValid ? ' ✓' : ' ⚠️'}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addMilestone}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Milestone
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {milestones.map((milestone, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-3">
                      <Label>Milestone Name</Label>
                      <Input
                        value={milestone.name}
                        onChange={(e) => updateMilestone(index, 'name', e.target.value)}
                        placeholder="Project Kickoff"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Payment %</Label>
                      <Input
                        type="number"
                        value={milestone.percentage}
                        onChange={(e) => updateMilestone(index, 'percentage', e.target.value)}
                        placeholder="30"
                        max="100"
                        className={!validateMilestones().isValid && milestone.percentage ? 'border-destructive' : ''}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Due Date</Label>
                      <Input
                        type="date"
                        value={milestone.due_date}
                        onChange={(e) => updateMilestone(index, 'due_date', e.target.value)}
                      />
                    </div>
                    <div className="col-span-4">
                      <Label>Description</Label>
                      <Input
                        value={milestone.description}
                        onChange={(e) => updateMilestone(index, 'description', e.target.value)}
                        placeholder="Initial content delivery"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMilestone(index)}
                        disabled={milestones.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          </form>
        </div>

        {/* Sticky Footer */}
        <DialogFooter className="sticky bottom-0 bg-background z-10 py-3 px-6 border-t flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit"
            form="payment-term-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : paymentTerm ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
