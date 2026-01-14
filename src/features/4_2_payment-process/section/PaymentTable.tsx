import { useState, useRef } from 'react';
import { usePurchaseRequests, PurchaseRequest, useUpdatePurchaseRequestStatus } from '@/features/9_request-form/hooks/usePurchaseRequests';
import { formatToRupiah } from '@/utils/formatCurrency';
import { Badge } from '@/features/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { CreditCard, User, Building, Calendar, FileText, DollarSign, Target, Zap, TrendingUp, Upload, X, CheckCircle, Lock, Key } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/features/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/features/ui/card';
import { Separator } from '@/features/ui/separator';
import { Button } from '@/features/ui/button';
import { Label } from '@/features/ui/label';
import { Input } from '@/features/ui/input';
import { useToast } from '@/features/ui/use-toast';
import { useCurrentOrg } from '@/features/share/hooks/useCurrentOrg';
import { useCurrentUser } from '@/features/share/hooks/useCurrentUser';
import { supabase } from '@/integrations/supabase/client';

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
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [isUploadingInvoice, setIsUploadingInvoice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { organizationId } = useCurrentOrg();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const updateStatus = useUpdatePurchaseRequestStatus();

  // Filter only approved requests (include both paid and unpaid for history)
  const paymentRequests = requests.filter(req => req.status === 'approved');

  const getStatusBadge = (request: PurchaseRequest) => {
    if (request.paid_at || request.payment_status === 'paid') {
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
    setInvoiceFile(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type (allow PDF, images, etc.)
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF or image file (JPEG, PNG, GIF).",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 10MB.",
          variant: "destructive",
        });
        return;
      }
      
      setInvoiceFile(file);
    }
  };

  const handleUploadInvoice = async () => {
    if (!selectedRequest || !invoiceFile || !organizationId || !user) {
      return;
    }

    setIsUploadingInvoice(true);
    try {
      // Generate unique file path
      const timestamp = Date.now();
      const fileExt = invoiceFile.name.split('.').pop();
      const fileName = `invoices/${organizationId}/${selectedRequest.id}/${timestamp}-${invoiceFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      
      // Upload to purchase-documents bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('purchase-documents')
        .upload(fileName, invoiceFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Update purchase request with invoice file path and mark as paid
      await updateStatus.mutateAsync({
        id: selectedRequest.id,
        status: selectedRequest.status,
        invoiceFilePath: fileName, // Store the path, not the full URL
      });

      toast({
        title: "Success",
        description: "Invoice uploaded successfully and payment status updated to paid.",
      });

      // Reset state
      setInvoiceFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsModalOpen(false);
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error('Error uploading invoice:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingInvoice(false);
    }
  };

  const handleRemoveFile = () => {
    setInvoiceFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleViewInvoice = async (e: React.MouseEvent, filePath: string) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.storage
        .from('purchase-documents')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        toast({
          title: "Error",
          description: "Failed to generate invoice URL. Please try again.",
          variant: "destructive",
        });
        return;
      }

      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('Error viewing invoice:', error);
      toast({
        title: "Error",
        description: "Failed to open invoice. Please try again.",
        variant: "destructive",
      });
    }
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
      <div className="flex-1 overflow-x-auto seamless-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <Table className="min-w-[1400px]">
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="h-8 px-3 text-xs font-medium whitespace-nowrap">Request</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium whitespace-nowrap">Requester</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium whitespace-nowrap">Department</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium whitespace-nowrap">Amount</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium whitespace-nowrap">Type</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium whitespace-nowrap">Status</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium whitespace-nowrap">Recurring</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium whitespace-nowrap">Approval Date</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium whitespace-nowrap">Paid Date</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium whitespace-nowrap">Paid By</TableHead>
              <TableHead className="h-8 px-3 text-xs font-medium w-16 whitespace-nowrap">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-16 text-center">
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
                    <div className="font-bold text-gray-900">{formatToRupiah(request.amount_idr)}</div>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    <Badge variant="outline" className="text-xs">
                      {getTypeDisplay(request)}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs">
                    {getStatusBadge(request)}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs whitespace-nowrap">
                    <Badge variant={request.is_recurring ? 'default' : 'secondary'}>
                      {request.is_recurring ? 'Recurring' : 'One-time'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">
                    {request.approved_at ? (
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-gray-100">
                          <Calendar className="h-3 w-3 text-gray-600" />
                        </div>
                        <span>{format(new Date(request.approved_at), 'MMM dd, yyyy')}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">
                    {request.paid_at ? (
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-gray-100">
                          <Calendar className="h-3 w-3 text-gray-600" />
                        </div>
                        <span>{format(new Date(request.paid_at), 'MMM dd, yyyy')}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2 text-xs text-gray-600">
                    {request.paid_by_name ? (
                      <span className="font-medium">{request.paid_by_name}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
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
            <DialogTitle className="flex items-center justify-between">
              <span>Payment Request Details</span>
              {selectedRequest && getStatusBadge(selectedRequest)}
            </DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {/* Basic Information */}
              <Card className="border-slate-200">
                <CardHeader className="px-4 py-3 pb-2">
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 py-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-start gap-2.5">
                      <FileText className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 mb-1">Title</p>
                        <p className="font-medium text-slate-900 break-words">{selectedRequest.request_title}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <DollarSign className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 mb-1">Amount</p>
                        <p className="font-medium text-slate-900">{formatToRupiah(selectedRequest.amount_idr)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <User className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 mb-1">Requester</p>
                        <p className="font-medium text-slate-900 break-words">{selectedRequest.requester_name}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Building className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 mb-1">Department</p>
                        <p className="font-medium text-slate-900">{selectedRequest.department_name || 'Not specified'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Calendar className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 mb-1">Approved Date</p>
                        <p className="font-medium text-slate-900">
                          {format(new Date(selectedRequest.approved_at || selectedRequest.created_at || ''), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <CreditCard className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-500 mb-1">Type</p>
                        <p className="font-medium text-slate-900">
                          {selectedRequest.request_type === 'reimbursement' 
                            ? selectedRequest.reimbursement_type || 'Reimbursement'
                            : selectedRequest.purchase_type || 'Purchase'}
                        </p>
                      </div>
                    </div>
                    {selectedRequest.is_recurring && (
                      <div className="flex items-start gap-2.5">
                        <TrendingUp className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-500 mb-1">Frequency</p>
                          <p className="font-medium text-purple-600">{selectedRequest.recurring_frequency}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Account Information */}
              {(selectedRequest.account_username || selectedRequest.account_password) && (
                <Card className="border-slate-200">
                  <CardHeader className="px-4 py-3 pb-2">
                    <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 py-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedRequest.account_username && (
                        <div className="flex items-start gap-2.5">
                          <User className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 mb-1">Username/Email</p>
                            <p className="font-medium text-slate-900 break-words">
                              {selectedRequest.account_username}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedRequest.account_password && (
                        <div className="flex items-start gap-2.5">
                          <Lock className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-500 mb-1">Account Password</p>
                            <p className="font-medium text-slate-900 break-words">
                              {selectedRequest.account_password}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Description */}
              <Card className="border-slate-200">
                <CardHeader className="px-4 py-3 pb-2">
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 py-3">
                  <p className="text-slate-700 whitespace-pre-wrap">
                    {selectedRequest.description || 'No description provided'}
                  </p>
                </CardContent>
              </Card>

              {/* Expected Outcome */}
              {selectedRequest.expected_outcome && (
                <Card className="border-slate-200">
                  <CardHeader className="px-4 py-3 pb-2">
                    <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Expected Outcome
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 py-3">
                    <p className="text-slate-700 whitespace-pre-wrap">
                      {selectedRequest.expected_outcome}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Purchase Details */}
              {selectedRequest.request_type === 'purchase' && (selectedRequest.vendor_name || selectedRequest.purchase_link || selectedRequest.purchase_type) && (
                <Card className="border-slate-200">
                  <CardHeader className="px-4 py-3 pb-2">
                    <CardTitle className="text-base font-semibold text-slate-900">
                      Purchase Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 py-3">
                    <div className="space-y-3">
                      {selectedRequest.vendor_name && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Vendor</p>
                          <p className="font-medium text-slate-900">{selectedRequest.vendor_name}</p>
                        </div>
                      )}
                      {selectedRequest.purchase_link && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Purchase Link</p>
                          <a
                            href={selectedRequest.purchase_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 hover:underline text-sm break-all"
                          >
                            {selectedRequest.purchase_link}
                          </a>
                        </div>
                      )}
                      {selectedRequest.purchase_type && (
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Type</p>
                          <p className="font-medium text-slate-900">{selectedRequest.purchase_type}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Reimbursement Details */}
              {selectedRequest.request_type === 'reimbursement' && (
                <Card className="border-slate-200">
                  <CardHeader className="px-4 py-3 pb-2">
                    <CardTitle className="text-base font-semibold text-slate-900">
                      Reimbursement Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 py-3">
                    <div className="space-y-3">
                      {selectedRequest.reimbursement_type && (
                        <div>
                          <p className="text-xs text-slate-600">Type</p>
                          <p className="font-medium">{selectedRequest.reimbursement_type}</p>
                        </div>
                      )}
                      {selectedRequest.merchant_name && (
                        <div>
                          <p className="text-xs text-slate-600">Merchant</p>
                          <p className="font-medium">{selectedRequest.merchant_name}</p>
                        </div>
                      )}
                      {selectedRequest.receipt_number && (
                        <div>
                          <p className="text-xs text-slate-600">Receipt Number</p>
                          <p className="font-medium">{selectedRequest.receipt_number}</p>
                        </div>
                      )}
                      {selectedRequest.expense_date && (
                        <div>
                          <p className="text-xs text-slate-600">Expense Date</p>
                          <p className="font-medium">{format(new Date(selectedRequest.expense_date), 'MMM dd, yyyy')}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Information */}
              <Card className="border-slate-200">
                <CardHeader className="px-4 py-3 pb-2">
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 py-3">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Payment Status</p>
                      {getStatusBadge(selectedRequest)}
                    </div>
                    {selectedRequest.paid_at && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Paid Date</p>
                        <p className="font-medium text-slate-900">
                          {format(new Date(selectedRequest.paid_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    )}
                    {selectedRequest.invoice_file_path && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Invoice</p>
                        <a
                          href="#"
                          onClick={(e) => handleViewInvoice(e, selectedRequest.invoice_file_path!)}
                          className="text-blue-600 hover:text-blue-700 hover:underline text-sm flex items-center gap-2 cursor-pointer"
                        >
                          <FileText className="h-4 w-4" />
                          View Invoice
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Invoice Upload Section */}
              {!selectedRequest.paid_at && (
                <>
                  <Separator className="my-4" />
                  
                  <Card className="border-slate-200">
                    <CardHeader className="px-4 py-3 pb-2">
                      <CardTitle className="text-base font-semibold text-slate-900">
                        Upload Invoice
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 py-3 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="invoice-file" className="text-sm font-medium">
                          Invoice File <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            ref={fileInputRef}
                            id="invoice-file"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.gif"
                            onChange={handleFileSelect}
                            className="flex-1"
                          />
                          {invoiceFile && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveFile}
                              className="h-8 w-8 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {invoiceFile && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <FileText className="h-4 w-4" />
                            <span className="flex-1 truncate">{invoiceFile.name}</span>
                            <span className="text-xs text-slate-500">
                              {(invoiceFile.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-slate-500">
                          Supported formats: PDF, JPEG, PNG, GIF (Max 10MB)
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={handleUploadInvoice}
                        disabled={!invoiceFile || isUploadingInvoice || updateStatus.isPending}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isUploadingInvoice || updateStatus.isPending ? (
                          <>
                            <Upload className="mr-2 h-4 w-4 animate-pulse" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Upload Invoice & Mark as Paid
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
