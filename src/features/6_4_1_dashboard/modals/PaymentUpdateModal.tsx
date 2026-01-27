import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Textarea } from '@/features/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/features/ui/select';
import { useKOLPaymentTerms } from '../hooks/useKOLPaymentTerms';
import { DollarSign, Calendar, AlertTriangle } from 'lucide-react';

interface PaymentUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentTerm: any;
}

export const PaymentUpdateModal: React.FC<PaymentUpdateModalProps> = ({
  isOpen,
  onClose,
  paymentTerm
}) => {
  const { updatePaymentStatus } = useKOLPaymentTerms();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    remaining_amount: paymentTerm?.remaining_amount || paymentTerm?.base_amount || 0,
    final_payment_date: paymentTerm?.final_payment_date ? paymentTerm.final_payment_date.split('T')[0] : '',
    deduction_amount: paymentTerm?.deduction_amount || 0,
    deduction_reason: paymentTerm?.deduction_reason || '',
    status: paymentTerm?.status || 'draft'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Calculate the actual remaining amount after deductions
      const baseTotal = (paymentTerm.base_amount || 0) + (paymentTerm.bonus_amount || 0);
      const downPayment = paymentTerm.down_payment_amount || 0;
      const deduction = formData.deduction_amount || 0;
      const calculatedRemaining = baseTotal - downPayment - deduction;
      
      // Clean form data - convert empty strings to null for date fields
      const cleanedData = {
        ...formData,
        final_payment_date: formData.final_payment_date.trim() === '' ? null : formData.final_payment_date,
        remaining_amount: Math.max(0, calculatedRemaining), // Ensure no negative amounts
        // If DP is being paid, set the down payment date
        down_payment_date: formData.status === 'dp_paid' && !paymentTerm.down_payment_date 
          ? new Date().toISOString().split('T')[0] 
          : paymentTerm.down_payment_date
      };
      
      await updatePaymentStatus(paymentTerm.id, cleanedData);
      onClose();
    } catch (error) {
      console.error('Error updating payment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!paymentTerm) return null;

  const totalAmount = (paymentTerm.base_amount || 0) + (paymentTerm.bonus_amount || 0);
  const downPaymentAmount = paymentTerm.down_payment_amount || 0;
  const remainingAfterDP = totalAmount - downPaymentAmount;
  const finalAmount = remainingAfterDP - (formData.deduction_amount || 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Update Payment - {paymentTerm.kol_profiles?.name || 'Unknown KOL'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Payment Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Total Amount:</span>
                <span className="font-semibold ml-2">
                  {paymentTerm.currency} {totalAmount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Down Payment:</span>
                <span className="font-semibold ml-2">
                  {paymentTerm.currency} {downPaymentAmount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-600">KOL Name:</span>
                <span className="font-semibold ml-2">
                  {paymentTerm.kol_profiles?.name || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Content Post:</span>
                <span className="font-semibold ml-2">
                  {paymentTerm.kol_content_posts?.title || 'No Post'}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Payment Model:</span>
                <span className="font-semibold ml-2">
                  {paymentTerm.payment_model?.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Remaining After DP:</span>
                <span className="font-semibold ml-2">
                  {paymentTerm.currency} {remainingAfterDP.toLocaleString()}
                </span>
              </div>
            </div>
          </div>


          {/* Deductions */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Deductions (Target Not Met)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deduction_amount">Deduction Amount</Label>
                <Input
                  id="deduction_amount"
                  type="number"
                  min="0"
                  max={remainingAfterDP}
                  value={formData.deduction_amount}
                  onChange={(e) => handleInputChange('deduction_amount', Number(e.target.value))}
                  placeholder="Enter deduction amount"
                />
              </div>
              <div>
                <Label htmlFor="deduction_reason">Deduction Reason</Label>
                <Select 
                  value={formData.deduction_reason} 
                  onValueChange={(value) => handleInputChange('deduction_reason', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engagement_target_not_met">Engagement Target Not Met</SelectItem>
                    <SelectItem value="reach_target_not_met">Reach Target Not Met</SelectItem>
                    <SelectItem value="conversion_target_not_met">Conversion Target Not Met</SelectItem>
                    <SelectItem value="content_quality_issue">Content Quality Issue</SelectItem>
                    <SelectItem value="timeline_violation">Timeline Violation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Final Payment */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Final Payment
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Final Amount</Label>
                <div className="p-2 bg-slate-100 rounded border">
                  <span className="font-semibold">
                    {paymentTerm.currency} {finalAmount.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-600 ml-2">
                    (Remaining: {remainingAfterDP.toLocaleString()} - Deduction: {formData.deduction_amount.toLocaleString()})
                  </span>
                </div>
              </div>
              <div>
                <Label htmlFor="final_payment_date">Final Payment Date</Label>
                <Input
                  id="final_payment_date"
                  type="date"
                  value={formData.final_payment_date}
                  onChange={(e) => handleInputChange('final_payment_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Payment Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => handleInputChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="agreed">Agreed</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="dp_paid">DP Paid</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
