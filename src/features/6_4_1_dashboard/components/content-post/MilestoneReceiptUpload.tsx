import React, { useState } from 'react';
import { Button } from '@/features/ui/button';
import { Card, CardContent } from '@/features/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Input } from '@/features/ui/input';
import { Label } from '@/features/ui/label';
import { Badge } from '@/features/ui/badge';
import { usePaymentMilestones, PaymentMilestone } from '@/hooks/organized/utils';
import { Upload, FileText, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface MilestoneReceiptUploadProps {
  milestone: PaymentMilestone;
  isOpen: boolean;
  onClose: () => void;
}

export const MilestoneReceiptUpload = ({ 
  milestone, 
  isOpen, 
  onClose 
}: MilestoneReceiptUploadProps) => {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { updateMilestoneStatus } = usePaymentMilestones();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleFileUpload = (file: File, type: 'receipt' | 'invoice') => {
    if (type === 'receipt') {
      setReceiptFile(file);
    } else {
      setInvoiceFile(file);
    }
  };

  const handleSubmit = async () => {
    // If invoice is uploaded, automatically mark as completed regardless of receipt
    const shouldComplete = invoiceFile || receiptFile;
    
    if (!shouldComplete) {
      toast.error('Please upload at least one document (receipt or invoice)');
      return;
    }

    setIsUploading(true);
    try {
      // In a real app, you would upload files to storage first
      // For now, we'll simulate the URLs
      const receiptUrl = receiptFile ? `receipts/${milestone.id}_receipt_${Date.now()}.${receiptFile.name.split('.').pop()}` : null;
      const invoiceUrl = invoiceFile ? `invoices/${milestone.id}_invoice_${Date.now()}.${invoiceFile.name.split('.').pop()}` : null;

      // Update milestone - if invoice is uploaded, it will auto-complete due to database trigger
      await updateMilestoneStatus({
        id: milestone.id,
        status: invoiceFile ? 'completed' : milestone.status, // Auto-complete if invoice uploaded
        notes: `Payment ${invoiceFile ? 'completed' : 'updated'} on ${new Date().toLocaleDateString('id-ID')}. ${receiptUrl ? 'Receipt uploaded.' : ''} ${invoiceUrl ? 'Invoice uploaded.' : ''}`,
        invoiceFilePath: invoiceUrl
      });

      toast.success(invoiceFile ? 'Invoice uploaded - milestone automatically completed!' : 'Receipt uploaded successfully');
      onClose();
    } catch (error) {
      console.error('Error updating milestone:', error);
      toast.error('Failed to update milestone');
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (type: 'receipt' | 'invoice') => {
    if (type === 'receipt') {
      setReceiptFile(null);
    } else {
      setInvoiceFile(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Complete Payment Milestone
          </DialogTitle>
          <DialogDescription>
            Upload receipt or invoice to mark this milestone as completed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Milestone Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{milestone.milestone_name}</span>
                  <Badge variant="outline">
                    {milestone.percentage}%
                  </Badge>
                </div>
                <div className="text-lg font-bold text-primary">
                  {formatCurrency(milestone.amount)}
                </div>
                {milestone.due_date && (
                  <div className="text-sm text-muted-foreground">
                    Due: {new Date(milestone.due_date).toLocaleDateString('id-ID')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label htmlFor="receipt-upload">Payment Receipt</Label>
            {receiptFile ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-green-50 border-green-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">{receiptFile.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile('receipt')}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Input
                id="receipt-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'receipt');
                }}
              />
            )}
          </div>

          {/* Invoice Upload */}
          <div className="space-y-2">
            <Label htmlFor="invoice-upload">Invoice (Optional)</Label>
            {invoiceFile ? (
              <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-700">{invoiceFile.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile('invoice')}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Input
                id="invoice-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'invoice');
                }}
              />
            )}
          </div>

          {/* Upload Guidelines */}
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <p>• Upload clear images or PDF files</p>
            <p>• Receipt or invoice is required to update payment</p>
            <p>• <strong>Invoice upload automatically marks milestone as completed</strong></p>
            <p>• Receipt is for documentation and tracking purposes</p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isUploading || (!receiptFile && !invoiceFile)}
          >
            {isUploading ? (
              'Completing...'
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Complete Milestone
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
