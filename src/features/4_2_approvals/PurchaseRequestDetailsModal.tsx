
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Badge } from '@/features/ui/badge';
import { formatToRupiah } from '@/utils/formatCurrency';
import { format } from 'date-fns';
import { PurchaseRequest } from '@/features/9_request-form/hooks/usePurchaseRequests';
import { Calendar, User, Building, DollarSign, FileText, Target, Zap, TrendingUp } from 'lucide-react';

interface PurchaseRequestDetailsModalProps {
  request: PurchaseRequest | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseRequestDetailsModal = ({ request, isOpen, onClose }: PurchaseRequestDetailsModalProps) => {
  if (!request) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending_approval':
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800">Pending Approval</Badge>;
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Request Details</span>
            {getStatusBadge(request.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-slate-50 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900 mb-3">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-xs text-slate-600">Title</p>
                  <p className="font-medium">{request.request_title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-xs text-slate-600">Amount</p>
                  <p className="font-medium">{formatToRupiah(request.amount_idr)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-xs text-slate-600">Requester</p>
                  <p className="font-medium">{request.requester_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-xs text-slate-600">Department</p>
                  <p className="font-medium">{request.department_name || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-600" />
                <div>
                  <p className="text-xs text-slate-600">Created</p>
                  <p className="font-medium">{format(new Date(request.created_at), 'MMM dd, yyyy')}</p>
                </div>
              </div>
              {request.is_recurring && (
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-slate-600">Frequency</p>
                    <p className="font-medium text-purple-600">{request.recurring_frequency}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
            <p className="text-slate-700 bg-slate-50 p-3 rounded-lg">
              {request.description || 'No description provided'}
            </p>
          </div>

          {/* Business Impact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Company Benefit
              </h3>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-lg text-sm">
                {request.company_benefit || 'Not specified'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Expected Outcome
              </h3>
              <p className="text-slate-700 bg-slate-50 p-3 rounded-lg text-sm">
                {request.expected_outcome || 'Not specified'}
              </p>
            </div>
          </div>

          {/* Purchase Details */}
          {request.request_type === 'purchase' && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Purchase Details</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                {request.vendor_name && (
                  <div>
                    <p className="text-xs text-slate-600">Vendor</p>
                    <p className="font-medium">{request.vendor_name}</p>
                  </div>
                )}
                {request.purchase_link && (
                  <div>
                    <p className="text-xs text-slate-600">Purchase Link</p>
                    <a href={request.purchase_link} target="_blank" rel="noopener noreferrer" 
                       className="text-blue-600 hover:underline text-sm">
                      {request.purchase_link}
                    </a>
                  </div>
                )}
                {request.purchase_type && (
                  <div>
                    <p className="text-xs text-slate-600">Type</p>
                    <p className="font-medium">{request.purchase_type}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reimbursement Details */}
          {request.request_type === 'reimbursement' && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Reimbursement Details</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                {request.reimbursement_type && (
                  <div>
                    <p className="text-xs text-slate-600">Type</p>
                    <p className="font-medium">{request.reimbursement_type}</p>
                  </div>
                )}
                {request.merchant_name && (
                  <div>
                    <p className="text-xs text-slate-600">Merchant</p>
                    <p className="font-medium">{request.merchant_name}</p>
                  </div>
                )}
                {request.receipt_number && (
                  <div>
                    <p className="text-xs text-slate-600">Receipt Number</p>
                    <p className="font-medium">{request.receipt_number}</p>
                  </div>
                )}
                {request.expense_date && (
                  <div>
                    <p className="text-xs text-slate-600">Expense Date</p>
                    <p className="font-medium">{format(new Date(request.expense_date), 'MMM dd, yyyy')}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Approval Information */}
          {(request.status === 'approved' || request.status === 'rejected') && (
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Approval Information</h3>
              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                {request.approved_by_name && (
                  <div>
                    <p className="text-xs text-slate-600">Approved By</p>
                    <p className="font-medium">{request.approved_by_name}</p>
                  </div>
                )}
                {request.rejected_by_name && (
                  <div>
                    <p className="text-xs text-slate-600">Rejected By</p>
                    <p className="font-medium">{request.rejected_by_name}</p>
                  </div>
                )}
                {request.approved_at && (
                  <div>
                    <p className="text-xs text-slate-600">Date</p>
                    <p className="font-medium">{format(new Date(request.approved_at), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                )}
                {request.rejected_at && (
                  <div>
                    <p className="text-xs text-slate-600">Date</p>
                    <p className="font-medium">{format(new Date(request.rejected_at), 'MMM dd, yyyy HH:mm')}</p>
                  </div>
                )}
                {request.rejection_reason && (
                  <div>
                    <p className="text-xs text-slate-600">Rejection Reason</p>
                    <p className="font-medium text-red-600">{request.rejection_reason}</p>
                  </div>
                )}
                {request.approval_notes && (
                  <div>
                    <p className="text-xs text-slate-600">Notes</p>
                    <p className="font-medium">{request.approval_notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
