import { memo, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/features/1-login/hooks/useCurrentOrg";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mobile/components/ui/card";
import { Badge } from "@/mobile/components/ui/badge";
import { Button } from "@/mobile/components/ui/button";
import { Separator } from "@/mobile/components/ui/separator";
import { Skeleton } from "@/mobile/components/ui/skeleton";
import { formatIDR } from "@/features/10-management/utils/subscriptionUtils";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { toast } from "sonner";
import { Download, History, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Tables } from "@/mobile/integrations/supabase/types";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

type PaymentRecord = Tables<"payments"> & {
  subscription_plans: {
    id: string;
    name: string;
    base_price_per_member: number;
  } | null;
  notes?: string | null;
};

const statusBadgeVariant = (status: string, t: (key: string) => string) => {
  switch (status?.toLowerCase()) {
    case "settlement":
    case "success":
    case "paid":
      return { className: "bg-emerald-500/10 text-emerald-700", label: t("subscription.management.statusSuccess") };
    case "pending":
      return { className: "bg-amber-500/10 text-amber-700", label: t("subscription.management.statusPending") };
    case "failed":
    case "cancelled":
      return { className: "bg-red-500/10 text-red-700", label: t("subscription.management.statusFailed") };
    default:
      return { className: "bg-muted text-muted-foreground", label: status || t("subscription.management.statusUnknown") };
  }
};

const formatDateTime = (value: string) =>
  format(new Date(value), "dd MMM yyyy • HH:mm", { locale: localeID });

export const MobilePaymentHistory = memo(() => {
  const { t } = useAppTranslation();
  const { organizationId } = useCurrentOrg();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: payments = [], isLoading, isError, refetch } = useQuery<PaymentRecord[]>({
    queryKey: ["payment-history", organizationId],
    enabled: !!organizationId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select(
          `
          *,
          subscription_plans (
            id,
            name,
            base_price_per_member
          )
        `,
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const handleDownloadReceipt = useCallback(
    async (payment: PaymentRecord) => {
      if (!organizationId) return;
      setDownloadingId(payment.id);
      try {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("company_name, email, address")
          .eq("id", organizationId)
          .single();

        const doc = new jsPDF();
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("ProfitLoop Invoice", margin, 25);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text("ProfitLoop App", margin, 35);
        doc.text("Subscription Management System", margin, 41);
        doc.text("support@profitloop.app", margin, 47);
        doc.text("https://app.profitloop.id/", margin, 53);

        const infoX = pageWidth - margin - 80;
        doc.setFont("helvetica", "bold");
        doc.text("Invoice Detail", infoX, 35);
        doc.setFont("helvetica", "normal");
        doc.text(`Invoice #: ${payment.order_id}`, infoX, 41);
        doc.text(`Tanggal: ${payment.created_at ? formatDateTime(payment.created_at) : "-"}`, infoX, 47);
        doc.text(`Status: ${payment.status}`, infoX, 53);

        doc.text("Tagihan untuk:", margin, 70);
        doc.setFont("helvetica", "bold");
        doc.text(orgData?.company_name || t("subscription.management.invoiceCompanyFallback"), margin, 76);
        doc.setFont("helvetica", "normal");
        if (orgData?.email) doc.text(orgData.email, margin, 82);
        if (orgData?.address) doc.text(orgData.address, margin, 88);

        doc.text("Ringkasan Pembayaran", margin, 105);
        autoTable(doc, {
          startY: 110,
          head: [["Deskripsi", "Jumlah"]],
          body: [
            [
              `${payment.subscription_plans?.name || "Subscription"} (${payment.billing_cycle})`,
              formatIDR(payment.amount),
            ],
          ],
          theme: "grid",
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
        });

        const finalY = (doc as any).lastAutoTable.finalY || 130;
        doc.setFont("helvetica", "bold");
        doc.text(`Total dibayar: ${formatIDR(payment.amount)}`, margin, finalY + 15);

        doc.save(`invoice-${payment.order_id}.pdf`);
      } catch {
        toast.error(t("subscription.management.downloadReceiptError"));
      } finally {
        setDownloadingId(null);
      }
    },
    [organizationId, t],
  );

  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-base text-foreground">{t("subscription.management.paymentHistory")}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {t("subscription.management.loadingPayments")}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-3 px-3 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={`payment-skeleton-${i}`} className="h-14 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border border-destructive/40 bg-destructive/5">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-base text-destructive">{t("subscription.management.errorLoadPayments")}</CardTitle>
          <CardDescription className="text-xs text-destructive mt-0.5">
            {t("subscription.management.errorLoadDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            {t("subscription.management.tryAgain")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!payments.length) {
    return (
      <Card className="border border-border">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-base text-foreground">{t("subscription.management.paymentHistory")}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {t("subscription.management.noPayments")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 py-6 px-3 pb-3 text-sm text-muted-foreground">
          <History className="h-8 w-8 text-muted-foreground/60" />
          <p>{t("subscription.management.noPaymentsHint")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-base text-foreground">{t("subscription.management.paymentHistory")}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-0.5">
          {t("subscription.management.paymentHistoryDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0 px-3 pb-3">
        {payments.map((payment) => {
          const badge = statusBadgeVariant(payment.status, t);
          return (
            <div
              key={payment.id}
              className="space-y-2 rounded-2xl border border-border bg-muted/30 p-2.5 text-sm text-muted-foreground"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {payment.subscription_plans?.name || t("subscription.management.planFallback")}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{formatIDR(payment.amount)}</p>
                </div>
                <Badge className={badge.className}>{badge.label}</Badge>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>{t("subscription.management.transactionId")}</span>
                  <span className="font-medium text-foreground">{payment.order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("subscription.management.date")}</span>
                  <span className="font-medium text-foreground">{formatDateTime(payment.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("subscription.management.billingCycle")}</span>
                  <span className="font-medium text-foreground capitalize">{payment.billing_cycle}</span>
                </div>
              </div>
              {payment.notes && (
                <div className="rounded-lg border border-border bg-background/60 p-1.5 text-[11px] text-muted-foreground">
                  {t("subscription.management.note")}: {payment.notes}
                </div>
              )}
              <Separator className="my-1.5" />
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center gap-2 text-xs"
                onClick={() => handleDownloadReceipt(payment)}
                disabled={downloadingId === payment.id}
              >
                {downloadingId === payment.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {downloadingId === payment.id ? t("subscription.management.downloadingReceipt") : t("subscription.management.downloadReceipt")}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});

MobilePaymentHistory.displayName = "MobilePaymentHistory";

