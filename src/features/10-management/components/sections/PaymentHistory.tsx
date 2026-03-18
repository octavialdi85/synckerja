
import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/features/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/features/ui/table';
import { Badge } from '@/features/ui/badge';
import { Button } from '@/features/ui/button';
import { Download, History, RefreshCw, Trash2, CreditCard } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/features/1-login/hooks/useCurrentOrg';
import { optimizedQueryKeys } from '@/features/10-management/hooks/useOptimizedQueryConfig';
import { useMidtransPayment } from '@/features/10-Plans/hooks/useMidtransPayment';
import { formatIDR } from '../../utils/subscriptionUtils';
import { format, addMonths, addYears } from 'date-fns';
import { id } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { useAppTranslation } from '@/features/share/i18n/useAppTranslation';
import { applyVariables } from '@/features/share/i18n/translations';


const PaymentHistory = () => {
  const { t } = useAppTranslation();
  const { organizationId } = useCurrentOrg();
  const queryClient = useQueryClient();

  const { openSnapForPendingOrder, isLoading: isSnapLoading } = useMidtransPayment({
    onPaymentStatusChange: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-pending', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['payment-history', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status', organizationId] });
    },
  });

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
        .in('status', ['success', 'settlement', 'paid'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    refetchOnWindowFocus: false,
  });

  const { data: pendingPayments = [] } = useQuery({
    queryKey: ['payment-pending', organizationId],
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
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    refetchOnWindowFocus: false,
  });

  const refreshPaymentStatus = useMutation({
    mutationFn: async (payment: any) => {
      // Try to use check-midtrans-payment-status first
      try {
        const { data, error } = await supabase.functions.invoke('check-midtrans-payment-status', {
          body: { order_id: payment.order_id }
        });

        if (!error && data && data.success) {
          return data;
        }
      } catch {
        // check-midtrans-payment-status not available, fallback below
      }

      // Fallback: Use process-midtrans-payment to manually trigger webhook processing
      // This simulates the webhook notification from Midtrans
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const webhookPayload = {
        order_id: payment.order_id,
        transaction_status: 'settlement', // Since we know it's success
        transaction_id: payment.transaction_id || null,
        fraud_status: 'accept',
        settlement_time: new Date().toISOString(),
        transaction_time: payment.transaction_time || payment.created_at || new Date().toISOString(),
        payment_type: payment.payment_type || 'credit_card',
        bank: payment.bank || null,
        approval_code: payment.approval_code || null,
      };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/process-midtrans-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_PUBLISHABLE_KEY
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update payment status');
      }

      const data = await response.json();
      return { success: true, status: 'success', message: 'Payment status updated successfully' };
    },
    onSuccess: (data, orderId) => {
      if (data.status === 'success') {
        toast.success('Payment status updated to: success. Subscription activated!');
      } else {
        toast.info(`Payment status: ${data.status}. Please wait for payment confirmation.`);
      }
      // Invalidate payment history and next billing (useNextBillingFromPayments)
      queryClient.invalidateQueries({ queryKey: ['payment-history', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['payment-history-next-billing', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['payment-pending', organizationId] });
      // Invalidate subscription status (correct key from useOptimizedSubscription)
      queryClient.invalidateQueries({ queryKey: optimizedQueryKeys.subscription.status(organizationId ?? '') });
    },
    onError: (error: Error) => {
      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('Function not found') || errorMessage.includes('404')) {
        toast.error('Edge function not deployed. Please contact administrator to deploy check-midtrans-payment-status function.');
      } else {
        toast.error(`Failed to refresh payment status: ${errorMessage}`);
      }
    },
  });

  const cancelPendingPayment = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke('cancel-pending-payment', {
        body: { order_id: orderId },
      });
      if (error) throw error;
      if (data && (data as { success?: boolean }).success !== true && (data as { error?: string }).error) {
        throw new Error((data as { message?: string }).message ?? (data as { error?: string }).error);
      }
      return data;
    },
    onSuccess: () => {
      toast.success(t('subscription.management.pendingPayments.deleteSuccess', 'Pending payment cancelled.'));
      queryClient.invalidateQueries({ queryKey: ['payment-pending', organizationId] });
      queryClient.invalidateQueries({ queryKey: ['payment-history', organizationId] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('subscription.management.pendingPayments.deleteError', 'Failed to cancel payment.'));
    },
  });

  // Next Payment Date: early payment → next = scheduled_due + 1 month; on-time/late → next = payment_date + 1 month.
  // Period: start = scheduled_due for this payment, end = next (so receipt and table stay in sync).
  const nextPaymentDateByPaymentId = useMemo(() => {
    const sorted = [...payments].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const nextMap = new Map<string, Date>();
    const periodStartMap = new Map<string, Date>();
    const periodEndMap = new Map<string, Date>();
    let prevNext: Date | null = null;
    for (const p of sorted) {
      const created = p.created_at ? new Date(p.created_at) : null;
      const cycle = p.billing_cycle === 'yearly' ? 12 : 1;
      const addOne = (d: Date) => (cycle === 12 ? addYears(d, 1) : addMonths(d, 1));
      let next: Date | null = null;
      const startFromDb = p.subscription_start_date ? new Date(p.subscription_start_date) : null;
      const endFromDb = p.subscription_end_date ? new Date(p.subscription_end_date) : null;
      const useDb = endFromDb && startFromDb && created && startFromDb.getTime() <= created.getTime();
      if (useDb) {
        next = endFromDb;
        periodStartMap.set(p.id, startFromDb);
        periodEndMap.set(p.id, endFromDb);
      } else if (created) {
        if (prevNext && created.getTime() < prevNext.getTime()) {
          next = addOne(prevNext);
          periodStartMap.set(p.id, prevNext);
        } else {
          next = addOne(created);
          periodStartMap.set(p.id, created);
        }
        if (next) periodEndMap.set(p.id, next);
      }
      if (next) nextMap.set(p.id, next);
      prevNext = next;
    }
    return { nextMap, periodStartMap, periodEndMap };
  }, [payments]);

  // Table always shows newest first regardless of cache order (hook may cache ASC when Overview loads first).
  const paymentsForDisplay = useMemo(
    () => [...payments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [payments]
  );

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

  const downloadReceipt = async (payment: any, precomputed?: { nextPaymentDate: Date | null; periodStart: Date | null; periodEnd: Date | null }) => {
    // Fetch organization data
    let orgData = null;
    let subscriptionData = null;
    if (organizationId) {
      const { data } = await supabase
        .from('organizations')
        .select('company_name, email, address')
        .eq('id', organizationId)
        .single();
      orgData = data;

      const { data: subscription } = await supabase
        .from('organization_subscriptions')
        .select('subscription_start_date, subscription_end_date, billing_cycle')
        .eq('last_payment_id', payment.id)
        .maybeSingle();
      subscriptionData = subscription;
    }
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Color scheme
    const greenColor = [34, 197, 94]; // Green-500 for PAID status
    const darkGray = [55, 65, 81]; // Gray-700
    
    // Total amount (no VAT for early stage)
    const totalAmount = payment.amount || 0;
    
    // Format currency helper
    const formatCurrency = (amount: number) => {
      return formatIDR(amount);
    };
    
    // Header - Logo and Company Name
    let currentY = 20;
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('ProfitLoop', margin, currentY);
    
    // Company information (FROM section)
    currentY += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('ProfitLoop App', margin, currentY);
    currentY += 5;
    doc.text('Subscription Management System', margin, currentY);
    currentY += 5;
    doc.text('Email: support@profitloop.app', margin, currentY);
    currentY += 5;
    doc.text('Website: https://app.profitloop.id/', margin, currentY);
    
    // Invoice details (right side)
    currentY = 20;
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    const invoiceLabel = 'INVOICE';
    const invoiceLabelWidth = doc.getTextWidth(invoiceLabel);
    doc.text(invoiceLabel, pageWidth - margin - invoiceLabelWidth, currentY);
    
    currentY += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    
    // Invoice Issued = date the invoice was issued (payment/transaction date), not today
    const invoiceIssuedDate = payment.created_at
      ? format(new Date(payment.created_at), 'dd MMMM yyyy', { locale: id })
      : new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    
    // Next Billing Date: use precomputed (same logic as table) or fallback with addMonths/addYears
    const nextBillingDate = precomputed?.nextPaymentDate
      ? format(precomputed.nextPaymentDate, 'dd MMMM yyyy', { locale: id })
      : (() => {
          const endFromDb = payment.subscription_end_date ?? subscriptionData?.subscription_end_date;
          if (endFromDb) return format(new Date(endFromDb), 'dd MMMM yyyy', { locale: id });
          if (payment.created_at) {
            const d = new Date(payment.created_at);
            const end = payment.billing_cycle === 'yearly' ? addYears(d, 1) : addMonths(d, 1);
            return format(end, 'dd MMMM yyyy', { locale: id });
          }
          return '-';
        })();
    
    // Invoice details (right side) - calculate proper position to avoid truncation
    const invoiceDetailsStartX = pageWidth / 2 + 10; // Start from middle + offset
    const maxInvoiceDetailsWidth = pageWidth - margin - invoiceDetailsStartX; // Max width available
    const labelColumnWidth = 50; // Fixed width for labels
    const valueColumnWidth = maxInvoiceDetailsWidth - labelColumnWidth - 5; // Remaining for values
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    // Invoice #
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('Invoice #:', invoiceDetailsStartX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const invoiceNumber = payment.order_id || 'N/A';
    const invoiceNumberWidth = doc.getTextWidth(invoiceNumber);
    const invoiceNumberX = Math.min(invoiceDetailsStartX + labelColumnWidth, pageWidth - margin - invoiceNumberWidth);
    doc.text(invoiceNumber, invoiceNumberX, currentY);
    
    currentY += 6;
    // Invoice Issued
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('Invoice Issued:', invoiceDetailsStartX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const invoiceIssuedDateWidth = doc.getTextWidth(invoiceIssuedDate);
    const invoiceIssuedDateX = Math.min(invoiceDetailsStartX + labelColumnWidth, pageWidth - margin - invoiceIssuedDateWidth);
    doc.text(invoiceIssuedDate, invoiceIssuedDateX, currentY);
    
    currentY += 6;
    // Next Billing Date (moved below Invoice Issued)
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('Next Billing Date:', invoiceDetailsStartX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const nextBillingDateWidth = doc.getTextWidth(nextBillingDate);
    const nextBillingDateX = Math.min(invoiceDetailsStartX + labelColumnWidth, pageWidth - margin - nextBillingDateWidth);
    doc.text(nextBillingDate, nextBillingDateX, currentY);
    
    currentY += 6;
    // Invoice Amount (without IDR) - right aligned
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('Invoice Amount:', invoiceDetailsStartX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const invoiceAmountText = formatCurrency(totalAmount);
    const invoiceAmountWidth = doc.getTextWidth(invoiceAmountText);
    // Right align: position at pageWidth - margin - textWidth
    const invoiceAmountX = pageWidth - margin - invoiceAmountWidth;
    doc.text(invoiceAmountText, invoiceAmountX, currentY);
    
    currentY += 6;
    // Status (label aligned left with other labels, value right aligned)
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('Status:', invoiceDetailsStartX, currentY);
    doc.setFont('helvetica', 'normal');
    const isPaid = payment.status?.toLowerCase() === 'settlement' || 
                   payment.status?.toLowerCase() === 'success' || 
                   payment.status?.toLowerCase() === 'paid';
    if (isPaid) {
      doc.setTextColor(greenColor[0], greenColor[1], greenColor[2]);
    } else {
      doc.setTextColor(0, 0, 0);
    }
    const statusText = (payment.status || 'PENDING').toUpperCase();
    // Status value right aligned
    const statusWidth = doc.getTextWidth(statusText);
    const statusX = pageWidth - margin - statusWidth;
    doc.text(statusText, statusX, currentY);
    
    // BILLED TO section
    currentY = 70;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('BILLED TO', margin, currentY);
    
    currentY += 7;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    // Get organization name from orgData or use default
    const orgName = orgData?.company_name || 'Customer';
    doc.text(orgName, margin, currentY);
    currentY += 5;
    doc.text('Indonesia', margin, currentY);
    // Try to get email from orgData
    const customerEmail = orgData?.email || 'customer@example.com';
    currentY += 5;
    doc.text(customerEmail, margin, currentY);
    
    // Line items table
    const billingCycleText = payment.billing_cycle === 'yearly' ? 'billed every year' : 
                            payment.billing_cycle === 'monthly' ? 'billed every month' : 
                            'billed every month';
    
    // Period for line items: use precomputed (same as table) or payment/subscriptionData/fallback with addMonths
    const periodStartDate = precomputed?.periodStart
      ? precomputed.periodStart
      : payment.subscription_start_date
        ? new Date(payment.subscription_start_date)
        : subscriptionData?.subscription_start_date
          ? new Date(subscriptionData.subscription_start_date)
          : payment.created_at
            ? new Date(payment.created_at)
            : null;
    const periodEndDate = precomputed?.periodEnd
      ? precomputed.periodEnd
      : payment.subscription_end_date
        ? new Date(payment.subscription_end_date)
        : subscriptionData?.subscription_end_date
          ? new Date(subscriptionData.subscription_end_date)
          : payment.created_at
            ? (payment.billing_cycle === 'yearly' ? addYears(new Date(payment.created_at), 1) : addMonths(new Date(payment.created_at), 1))
            : null;

    const periodStart = periodStartDate ? format(periodStartDate, 'MMM dd, yyyy', { locale: id }) : '-';
    const periodEnd = periodEndDate ? format(periodEndDate, 'MMM dd, yyyy', { locale: id }) : '-';
    
    const tableData = [
      [
        `${payment.subscription_plans?.name || 'Subscription Plan'} (${billingCycleText})\nPeriod: ${periodStart} to ${periodEnd}`,
        `${formatCurrency(totalAmount)} x 1`,
        '-',
        formatCurrency(totalAmount)
      ]
    ];
    
    autoTable(doc, {
      startY: currentY + 10,
      head: [['DESCRIPTION', 'PRICE', 'DISCOUNT', 'AMOUNT (IDR)']],
      body: tableData,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 4,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'normal',
        fontSize: 8,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'normal' },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'normal' },
      },
      didParseCell: (data: any) => {
        // Make header "AMOUNT (IDR)" right aligned
        if (data.section === 'head' && data.column.index === 3) {
          data.cell.styles.halign = 'right';
        }
      },
    });
    
    // Summary section (bottom right) - simplified without VAT
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    let summaryY = finalY + 15;
    
    // Calculate summary position to avoid truncation
    const summaryStartX = pageWidth / 2 + 10; // Start from middle + offset
    const summaryLabelWidth = 60; // Width for labels
    const maxSummaryValueWidth = pageWidth - margin - summaryStartX - summaryLabelWidth; // Max width for values
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    
    // Subtotal
    doc.text('Subtotal:', summaryStartX, summaryY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const subtotalText = formatCurrency(totalAmount);
    const subtotalTextWidth = doc.getTextWidth(subtotalText);
    const subtotalX = Math.min(summaryStartX + summaryLabelWidth, pageWidth - margin - subtotalTextWidth);
    doc.text(subtotalText, subtotalX, summaryY);
    
    summaryY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('Total:', summaryStartX, summaryY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const totalText = formatCurrency(totalAmount);
    const totalTextWidth = doc.getTextWidth(totalText);
    const totalX = Math.min(summaryStartX + summaryLabelWidth, pageWidth - margin - totalTextWidth);
    doc.text(totalText, totalX, summaryY);
    
    summaryY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('Payments:', summaryStartX, summaryY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const paymentText = isPaid ? `(${formatCurrency(totalAmount)})` : '-';
    const paymentTextWidth = doc.getTextWidth(paymentText);
    const paymentX = Math.min(summaryStartX + summaryLabelWidth, pageWidth - margin - paymentTextWidth);
    doc.text(paymentText, paymentX, summaryY);
    
    summaryY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('Amount Due (IDR):', summaryStartX, summaryY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const amountDue = isPaid ? 0 : totalAmount;
    const amountDueText = formatCurrency(amountDue);
    const amountDueTextWidth = doc.getTextWidth(amountDueText);
    const amountDueX = Math.min(summaryStartX + summaryLabelWidth, pageWidth - margin - amountDueTextWidth);
    doc.text(amountDueText, amountDueX, summaryY);
    
    // Footer
    const footerY = summaryY + 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('This is a computer generated invoice.', margin, footerY);
    
    // Page number
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Save the PDF
    doc.save(`invoice-${payment.order_id}.pdf`);
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
        {pendingPayments.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-800">
              {applyVariables(t('subscription.management.pendingPayments.title', 'You have {{count}} pending payment(s).'), { count: String(pendingPayments.length) })}
            </p>
            <ul className="mt-2 space-y-2">
              {pendingPayments.map((payment: any) => (
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-amber-900">{payment.order_id}</span>
                  <span className="font-semibold text-amber-900">{formatIDR(payment.amount || 0)}</span>
                  <span className="text-amber-700">
                    {payment.created_at ? format(new Date(payment.created_at), 'dd MMM yyyy', { locale: id }) : 'N/A'}
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openSnapForPendingOrder(payment.order_id)}
                      disabled={isSnapLoading}
                      className="gap-1"
                    >
                      <CreditCard className="h-4 w-4" />
                      {t('subscription.management.pendingPayments.pay', 'Bayar')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelPendingPayment.mutate(payment.order_id)}
                      disabled={cancelPendingPayment.isPending}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className={`h-4 w-4 ${cancelPendingPayment.isPending ? 'animate-spin' : ''}`} />
                      {t('subscription.management.pendingPayments.delete', 'Hapus')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refreshPaymentStatus.mutate(payment)}
                      disabled={refreshPaymentStatus.isPending}
                      className="gap-1"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshPaymentStatus.isPending ? 'animate-spin' : ''}`} />
                      {t('subscription.management.pendingPayments.refreshStatus', 'Refresh status')}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <History className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No payment history</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your payment history will appear here once you make your first payment.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-visible seamless-scroll nested-scroll-touch-chain min-w-0 rounded-md border">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Payment Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Next Payment Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsForDisplay.map((payment) => (
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
                    <TableCell className="whitespace-nowrap">
                      {payment.created_at ? (
                        <div className="flex items-center gap-1">
                          📅 {format(new Date(payment.created_at), 'dd MMM yyyy', { locale: id })}
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {(() => {
                        const endDate = nextPaymentDateByPaymentId.nextMap.get(payment.id) ?? null;
                        return endDate ? (
                          <div className="flex items-center gap-1">
                            📅 {format(endDate, 'dd MMM yyyy', { locale: id })}
                          </div>
                        ) : (
                          '-'
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadReceipt(payment, {
                          nextPaymentDate: nextPaymentDateByPaymentId.nextMap.get(payment.id) ?? null,
                          periodStart: nextPaymentDateByPaymentId.periodStartMap.get(payment.id) ?? null,
                          periodEnd: nextPaymentDateByPaymentId.periodEndMap.get(payment.id) ?? null,
                        })}
                          className="flex items-center gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Receipt
                        </Button>
                        {(payment.status?.toLowerCase() === 'pending') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refreshPaymentStatus.mutate(payment)}
                            disabled={refreshPaymentStatus.isPending}
                            className="flex items-center gap-1"
                          >
                            <RefreshCw className={`h-4 w-4 ${refreshPaymentStatus.isPending ? 'animate-spin' : ''}`} />
                            Refresh
                          </Button>
                        )}
                      </div>
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
