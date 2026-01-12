import { useState } from 'react';
import { usePurchaseRequests, PurchaseRequest } from '@/features/9_request-form/hooks/usePurchaseRequests';
import { formatToRupiah } from '@/utils/formatCurrency';
import { Badge } from '@/features/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { CreditCard, User, Building, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';

interface PaymentTableProps {
  requests: PurchaseRequest[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

export const PaymentTable = ({ 
  requests, 
  isLoading = false,
  onRefresh 
}: PaymentTableProps) => {
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter only approved requests
  const paymentRequests = requests.filter(req => req.status === 'approved');

  const getStatusBadge = (request: PurchaseRequest) => {
    if (request.paid_at) {
      return (
        <Badge className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
          Paid
        </Badge>
      );
    }
    if (request.payment_status === 'processing') {
      return (
        <Badge className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-0.5 rounded-full">
          Processing
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-100 text-amber-800 text-xs font-medium px-2 py-0.5 rounded-full">
        Pending
      </Badge>
    );
  };

  const getTypeDisplay = (request: PurchaseRequest) => {
    if (request.request_type === 'reimbursement') {
      return request.reimbursement_type || 'Reimbursement';
    }
    return request.purchase_type || 'Purchase';
  };

  const handleViewDetails = (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Payment Requests</h2>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto seamless-scroll">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="h-8 px-3 text-xs font-medium">Request</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium">Requester</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium">Department</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium">Amount</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium">Type</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium">Status</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium">Date</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium w-16">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-16 text-center">
                  <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-1">No payment requests found</p>
                  <p className="text-xs text-gray-400">Approved requests will appear here</p>
                </TableCell>
              </TableRow>
            ) : (
              paymentRequests.map((request) => (
                <TableRow key={request.id} className="hover:bg-gray-50">
                  <TableCell className="px-3 py-2 text-xs">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 rounded-md bg-blue-50 flex-shrink-0">
                        <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 truncate">
                          {request.request_title}
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {request.description || 'No description'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-gray-100">
                        <User className="h-3 w-3 text-gray-600" />
                      </div>
                      <span className="font-medium text-gray-700">{request.requester_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-gray-100">
                        <Building className="h-3 w-3 text-gray-600" />
                      </div>
                      <span>{request.department_name || 'Not specified'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-gray-900">{formatToRupiah(request.amount_idr)}</div>
                      {request.is_recurring && (
                        <Badge variant="outline" className="text-xs">Recurring</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {getTypeDisplay(request)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    {getStatusBadge(request)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-gray-100">
                        <Calendar className="h-3 w-3 text-gray-600" />
                      </div>
                      <span>{format(new Date(request.approved_at || request.created_at || ''), 'MMM dd, yyyy')}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    <button
                      onClick={() => handleViewDetails(request)}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      View
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Payment Request Detail Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">{selectedRequest.request_title}</h3>
                <p className="text-sm text-gray-600">{selectedRequest.description || 'No description'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Requester</p>
                  <p className="text-sm font-medium">{selectedRequest.requester_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="text-sm font-medium">{selectedRequest.department_name || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-sm font-bold">{formatToRupiah(selectedRequest.amount_idr)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="text-sm font-medium">
                    {selectedRequest.request_type === 'reimbursement' 
                      ? selectedRequest.reimbursement_type || 'Reimbursement'
                      : selectedRequest.purchase_type || 'Purchase'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  {getStatusBadge(selectedRequest)}
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedRequest.approved_at || selectedRequest.created_at || ''), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
