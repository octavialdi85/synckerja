import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/features/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { Card, CardContent } from '@/features/ui/card';
import { Trash2, Plus, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/organized/utils';
import { useKOLPaymentTerms } from '../hooks/useKOLPaymentTerms';
import { usePaymentMilestones } from '@/hooks/organized/utils';
import { useInvoiceUpload } from '@/hooks/organized/utils';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface UpdatePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentPost: any;
}

interface Milestone {
  id?: string;
  milestone_name: string;
  percentage: number;
  due_date?: string;
  description?: string;
  invoice_file?: File | null;
  status?: 'pending' | 'completed' | 'in_progress';
  invoice_uploaded?: boolean;
  paid_at?: string;
  invoice_file_path?: string;
  invoice_upload_date?: string;
}

export const UpdatePaymentModal = ({ open, onOpenChange, contentPost }: UpdatePaymentModalProps) => {
  const { toast } = useToast();
  const { updatePaymentTerm } = useKOLPaymentTerms();
  const { updateMilestoneStatus } = usePaymentMilestones();
  const { uploadInvoiceFile } = useInvoiceUpload();
  
  const [paymentModel, setPaymentModel] = useState('fixed');
  const [baseAmount, setBaseAmount] = useState('');
  const [paymentSchedule, setPaymentSchedule] = useState('milestone');
  const [milestones, setMilestones] = useState<Milestone[]>([
    { milestone_name: '', percentage: 0, due_date: '', description: '', invoice_file: null }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadWarning, setShowUploadWarning] = useState(false);
  const [warningMilestoneIndex, setWarningMilestoneIndex] = useState<number | null>(null);

  // Load existing data when modal opens
  useEffect(() => {
    const loadExistingData = async () => {
      if (open && contentPost) {
        try {
          // Debug: log the contentPost structure to understand the data
          console.log('UpdatePaymentModal - contentPost data:', contentPost);
          console.log('UpdatePaymentModal - kol_payment_terms:', contentPost.kol_payment_terms);
          
          // Load existing payment terms if available
          if (contentPost.kol_payment_terms && contentPost.kol_payment_terms.length > 0) {
            const paymentTerm = contentPost.kol_payment_terms[0];
            console.log('UpdatePaymentModal - Found payment term:', paymentTerm);
            
            setPaymentModel(paymentTerm.payment_model || 'fixed');
            setBaseAmount(paymentTerm.base_amount?.toString() || '');
            setPaymentSchedule(paymentTerm.payment_schedule || 'milestone');
            
            // Load existing milestones from the payment term
            if (paymentTerm.payment_milestones && paymentTerm.payment_milestones.length > 0) {
              console.log('UpdatePaymentModal - Found milestones:', paymentTerm.payment_milestones);
              setMilestones(paymentTerm.payment_milestones.map((m: any) => ({
                id: m.id,
                milestone_name: m.milestone_name || '',
                percentage: m.percentage || 0,
                due_date: m.due_date || '',
                description: m.milestone_description || m.description || '',
                invoice_file: null,
                status: m.status || 'pending',
                invoice_uploaded: m.invoice_uploaded || false,
                paid_at: m.paid_at,
                invoice_file_path: m.invoice_file_path,
                invoice_upload_date: m.invoice_upload_date
              })));
            } else {
              console.log('UpdatePaymentModal - No milestones found in payment term');
              setMilestones([{ milestone_name: '', percentage: 0, due_date: '', description: '', invoice_file: null }]);
            }
          } else {
            console.log('UpdatePaymentModal - No payment terms found');
            // Reset to default values if no existing data
            setPaymentModel('fixed');
            setBaseAmount('');
            setPaymentSchedule('milestone');
            setMilestones([{ milestone_name: '', percentage: 0, due_date: '', description: '', invoice_file: null }]);
          }
        } catch (error) {
          console.error('Error loading existing payment data:', error);
          // Reset to default values on error
          setPaymentModel('fixed');
          setBaseAmount('');
          setPaymentSchedule('milestone');
          setMilestones([{ milestone_name: '', percentage: 0, due_date: '', description: '', invoice_file: null }]);
        }
      }
    };

    loadExistingData();
  }, [open, contentPost]);

  const addMilestone = () => {
    setMilestones([...milestones, { milestone_name: '', percentage: 0, due_date: '', description: '', invoice_file: null }]);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  const updateMilestoneLocal = (index: number, field: keyof Milestone, value: any) => {
    const updated = [...milestones];
    updated[index] = { ...updated[index], [field]: value };
    setMilestones(updated);
  };

  const getTotalPercentage = () => {
    return milestones.reduce((sum, milestone) => sum + (milestone.percentage || 0), 0);
  };

  const isFormValid = () => {
    if (!baseAmount || baseAmount === '0') return false;
    
    const totalPercentage = getTotalPercentage();
    if (totalPercentage !== 100) return false;
    
    return milestones.every(milestone => 
      milestone.milestone_name.trim() !== '' && 
      milestone.percentage > 0
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields and ensure total percentage equals 100%",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create milestone data to be saved in payment terms structure
      const milestonesData = milestones.map((milestone, index) => ({
        milestone_name: milestone.milestone_name,
        amount: (parseFloat(baseAmount) * milestone.percentage) / 100,
        percentage: milestone.percentage,
        due_date: milestone.due_date || null,
        description: milestone.description || null,
        milestone_order: index + 1,
      }));

      // Update payment terms with the new structure
      await updatePaymentTerm(contentPost.id, {
        payment_model: paymentModel,
        base_amount: parseFloat(baseAmount),
        payment_schedule: paymentSchedule,
        milestones: milestonesData,
      });

      // Handle invoice uploads and mark milestones as completed
      const uploadPromises = milestones
        .filter(milestone => milestone.invoice_file && milestone.id)
        .map(async (milestone) => {
          try {
            console.log('🔄 Uploading invoice for milestone:', milestone.id);
            const invoiceFilePath = await uploadInvoiceFile(milestone.invoice_file!, milestone.id);
            
            if (invoiceFilePath) {
              console.log('✅ Invoice uploaded, marking milestone as completed:', milestone.id);
              // Mark milestone as completed after successful upload
              await updateMilestoneStatus({ 
                id: milestone.id!, 
                status: 'completed',
                invoiceFilePath,
                notes: `Invoice uploaded: ${milestone.invoice_file!.name}` 
              });
              console.log('✅ Milestone marked as completed:', milestone.id);
            }
          } catch (error) {
            console.error('❌ Error processing milestone invoice:', error);
            throw error; // Re-throw to be caught in the outer try-catch
          }
        });

      // Wait for all invoice uploads and milestone updates
      if (uploadPromises.length > 0) {
        console.log('🔄 Processing', uploadPromises.length, 'invoice uploads...');
        await Promise.all(uploadPromises);
        console.log('✅ All invoices processed and milestones updated');
      }

      toast({
        title: "Success",
        description: "Payment agreement updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error('❌ Error updating payment:', error);
      toast({
        title: "Error",
        description: "Failed to update payment agreement",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (index: number, file: File | null) => {
    const milestone = milestones[index];
    
    // Check if milestone is already completed
    if (milestone.status === 'completed' || milestone.invoice_uploaded) {
      setWarningMilestoneIndex(index);
      setShowUploadWarning(true);
      return;
    }
    
    updateMilestoneLocal(index, 'invoice_file', file);
  };

  const handleForceUpload = () => {
    if (warningMilestoneIndex !== null) {
      // Allow the upload by setting the file
      const fileInput = document.querySelector(`input[data-milestone-index="${warningMilestoneIndex}"]`) as HTMLInputElement;
      if (fileInput?.files?.[0]) {
        updateMilestoneLocal(warningMilestoneIndex, 'invoice_file', fileInput.files[0]);
      }
    }
    setShowUploadWarning(false);
    setWarningMilestoneIndex(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            💰 Update Payment Agreement
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Update payment terms and milestones for this content collaboration.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Model */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Payment Model</Label>
            <RadioGroup value={paymentModel} onValueChange={setPaymentModel}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed">Fixed Payment - Set amount regardless of performance</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="performance" id="performance" />
                <Label htmlFor="performance">Performance-Based - Payment based on metrics achieved</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="barter" id="barter" />
                <Label htmlFor="barter">Barter + Fee - Product/service exchange + cash</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Base Amount */}
          <div className="space-y-2">
            <Label htmlFor="baseAmount">Base Amount (IDR)</Label>
            <Input
              id="baseAmount"
              type="number"
              placeholder="0"
              value={baseAmount}
              onChange={(e) => setBaseAmount(e.target.value)}
            />
          </div>

          {/* Payment Schedule */}
          <div className="space-y-2">
            <Label htmlFor="paymentSchedule">Payment Schedule</Label>
            <Select value={paymentSchedule} onValueChange={setPaymentSchedule}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment schedule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="milestone">Milestone Based</SelectItem>
                <SelectItem value="upfront">Full Upfront</SelectItem>
                <SelectItem value="completion">Upon Completion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Milestones */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">💎 Payment Milestones</Label>
                <p className="text-sm text-muted-foreground">
                  Define payment milestones based on percentage of base amount. Total must equal 100%.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Total Percentage:</span>
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  getTotalPercentage() === 100 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {getTotalPercentage().toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {milestones.map((milestone, index) => {
                const isCompleted = milestone.status === 'completed' || milestone.invoice_uploaded;
                const borderColor = isCompleted ? 'border-l-green-500' : 'border-l-blue-200';
                
                return (
                <Card key={index} className={`border-l-4 ${borderColor} ${isCompleted ? 'bg-green-50' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Milestone {index + 1}</h4>
                        {isCompleted && (
                          <div className="flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-full text-xs">
                            <CheckCircle className="h-3 w-3" />
                            <span>Completed</span>
                          </div>
                        )}
                      </div>
                      {milestones.length > 1 && !isCompleted && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMilestone(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Milestone Name *</Label>
                        <Input
                          placeholder="e.g., Down Payment"
                          value={milestone.milestone_name}
                          onChange={(e) => updateMilestoneLocal(index, 'milestone_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Percentage (%) *</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="0"
                          value={milestone.percentage || ''}
                          onChange={(e) => updateMilestoneLocal(index, 'percentage', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Due Date (Optional)</Label>
                        <Input
                          type="date"
                          value={milestone.due_date}
                          onChange={(e) => updateMilestoneLocal(index, 'due_date', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description (Optional)</Label>
                        <Textarea
                          placeholder="Payment conditions"
                          value={milestone.description}
                          onChange={(e) => updateMilestoneLocal(index, 'description', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>

                    {/* Invoice Upload */}
                    <div className="mt-4 space-y-2">
                      <Label>Invoice Upload (Optional)</Label>
                      {isCompleted ? (
                        <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                          <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Invoice already uploaded</span>
                          </div>
                          <div className="text-xs text-green-700 mt-1">
                            Completed on: {milestone.invoice_upload_date ? format(new Date(milestone.invoice_upload_date), 'dd MMM yyyy') : (milestone.paid_at ? format(new Date(milestone.paid_at), 'dd MMM yyyy') : 'Unknown date')}
                          </div>
                          {milestone.invoice_file_path && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2 h-8 px-3 text-xs"
                              onClick={async () => {
                                try {
                                  const { data } = await supabase.storage
                                    .from('invoices')
                                    .download(milestone.invoice_file_path);
                                  
                                  if (data) {
                                    const url = URL.createObjectURL(data);
                                    window.open(url, '_blank');
                                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                                  }
                                } catch (error) {
                                  console.error('Error downloading invoice:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to download invoice",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              View Invoice
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            data-milestone-index={index}
                            onChange={(e) => handleFileChange(index, e.target.files?.[0] || null)}
                            className="file:mr-2 file:py-1 file:px-3 file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                          />
                        </div>
                      )}
                      <p className="text-xs text-blue-600">
                        Upload invoice to automatically mark milestone as completed
                      </p>
                    </div>

                    {/* Amount Display */}
                    {baseAmount && milestone.percentage > 0 && (
                      <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                        <strong>Amount: </strong>
                        {new Intl.NumberFormat('id-ID', {
                          style: 'currency',
                          currency: 'IDR',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format((parseFloat(baseAmount) * milestone.percentage) / 100)}
                      </div>
                    )}
                  </CardContent>
                </Card>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={addMilestone}
              className="w-full border-dashed border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Milestone
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!isFormValid() || isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? 'Updating...' : 'Update Payment'}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Upload Warning Dialog */}
      <Dialog open={showUploadWarning} onOpenChange={setShowUploadWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <CheckCircle className="w-5 h-5" />
              Milestone Already Completed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This milestone has already been marked as completed. Are you sure you want to upload a new invoice? 
              This will replace the existing invoice.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowUploadWarning(false)}>
                Cancel
              </Button>
              <Button onClick={handleForceUpload} className="bg-amber-600 hover:bg-amber-700">
                Upload Anyway
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
