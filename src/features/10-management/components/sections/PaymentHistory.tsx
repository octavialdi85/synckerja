
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { Download, History } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { formatIDR } from '../../utils/subscriptionUtils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


const PaymentHistory = () => {
  const { organizationId } = useCurrentOrg();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payment-history', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          subscription_plans (
            id,
            name,
            base_price_per_member
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'settlement':
      case 'success':
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const downloadReceipt = (payment: any) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE / RECEIPT', 20, 20);
    
    // Company info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('ProfitLoop App', 20, 35);
    doc.text('Subscription Management System', 20, 42);
    
    // Invoice details
    const invoiceDate = new Date().toLocaleDateString('id-ID');
    const paymentDate = payment.created_at ? 
      format(new Date(payment.created_at), 'dd MMMM yyyy', { locale: id }) : 
      '-';
    
    doc.text(`Invoice Date: ${invoiceDate}`, 120, 35);
    doc.text(`Payment Date: ${paymentDate}`, 120, 42);
    doc.text(`Order ID: ${payment.order_id}`, 120, 49);
    
    if (payment.transaction_id) {
      doc.text(`Transaction ID: ${payment.transaction_id}`, 120, 56);
    }
    
    // Line separator
    doc.line(20, 65, 190, 65);
    
    // Payment details table
    const tableData = [
      ['Plan Name', payment.subscription_plans?.name || 'N/A'],
      ['Amount', formatIDR(payment.amount || 0)],
      ['Member Count', payment.member_count?.toString() || '0'],
      ['Billing Cycle', payment.billing_cycle || 'Monthly'],
      ['Payment Type', payment.payment_type || 'midtrans'],
      ['Status', payment.status || 'Pending'],
    ];
    
    autoTable(doc, {
      startY: 75,
      head: [['Description', 'Details']],
      body: tableData,
      theme: 'striped',
      styles: {
        fontSize: 10,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
    });
    
    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your subscription!', 20, finalY + 20);
    doc.text('This is a computer generated invoice.', 20, finalY + 27);
    
    // Save the PDF
    doc.save(`receipt-${payment.order_id}.pdf`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            Track all your subscription payments and upgrades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Payment History
        </CardTitle>
        <CardDescription>
          Track all your subscription payments and upgrades
        </CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <History className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No payment history</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your payment history will appear here once you make your first payment.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-sm">
                      {payment.order_id}
                    </TableCell>
                    <TableCell>
                      {payment.subscription_plans?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatIDR(payment.amount || 0)}
                    </TableCell>
                    <TableCell>{payment.member_count || 0}</TableCell>
                    <TableCell className="capitalize">
                      {payment.billing_cycle || 'Monthly'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {payment.payment_type || 'midtrans'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(payment.status)}>
                        {payment.status || 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.created_at ? (
                        <div className="flex items-center gap-1">
                          📅 {format(new Date(payment.created_at), 'dd MMM yyyy', { locale: id })}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadReceipt(payment)}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-4 w-4" />
                        Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export { PaymentHistory };
