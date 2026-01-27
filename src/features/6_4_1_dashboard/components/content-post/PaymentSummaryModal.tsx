import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Button } from '@/features/ui/button';
import { Badge } from '@/features/ui/badge';
import { Card, CardContent, CardHeader } from '@/features/ui/card';
import { PaymentMilestone } from '@/hooks/organized/utils';
import { PaymentMilestoneCell } from './PaymentMilestoneCell';
import { RemainingPaymentCell } from './RemainingPaymentCell';
import { DollarSign, Calendar, TrendingUp } from 'lucide-react';

interface PaymentSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestones: PaymentMilestone[];
  contentPostTitle?: string;
  kolName?: string;
}

export const PaymentSummaryModal = ({ 
  isOpen, 
  onClose, 
  milestones, 
  contentPostTitle,
  kolName 
}: PaymentSummaryModalProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
  const paidAmount = milestones
    .filter(m => m.status === 'completed')
    .reduce((sum, m) => sum + m.amount, 0);
  const remainingAmount = totalAmount - paidAmount;
  const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payment Summary
          </DialogTitle>
          {(contentPostTitle || kolName) && (
            <div className="text-sm text-muted-foreground">
              {kolName && <span>KOL: {kolName}</span>}
              {contentPostTitle && kolName && <span> • </span>}
              {contentPostTitle && <span>Post: {contentPostTitle}</span>}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Overview */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Payment Overview
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(totalAmount)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(paidAmount)}
                  </div>
                  <div className="text-sm text-muted-foreground">Paid Amount</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(remainingAmount)}
                  </div>
                  <div className="text-sm text-muted-foreground">Remaining</div>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <Badge variant="outline">
                    {Math.round(progressPercentage)}% Complete
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remaining Payment Details */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Payment Breakdown</h3>
            </CardHeader>
            <CardContent>
              <RemainingPaymentCell milestones={milestones} />
            </CardContent>
          </Card>

          {/* Detailed Milestones */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Payment Milestones
              </h3>
            </CardHeader>
            <CardContent>
              <PaymentMilestoneCell milestones={milestones} isCompact={false} />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
