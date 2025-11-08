import { memo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/features/1-login/hooks/useCurrentOrg";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/mobile/components/ui/card";
import { Badge } from "@/mobile/components/ui/badge";
import { Button } from "@/mobile/components/ui/button";
import { Separator } from "@/mobile/components/ui/separator";
import { LoadingDots } from "@/components/LoadingDots";
import { formatIDR } from "@/features/10-management/utils/subscriptionUtils";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { Download, History } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PaymentRecord {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  order_id: string;
  billing_cycle: string;
  notes: string | null;
  subscription_plans: {
    id: string;
    name: string;
    base_price_per_member: number;
  } | null;
}

const statusBadgeVariant = (status: string) => {
  switch (status?.toLowerCase()) {
    case "settlement":
    case "success":
    case "paid":
      return { className: "bg-emerald-500/10 text-emerald-700", label: "Berhasil" };
    case "pending":
      return { className: "bg-amber-500/10 text-amber-700", label: "Menunggu" };
    case "failed":
    case "cancelled":
      return { className: "bg-red-500/10 text-red-700", label: "Gagal" };
    default:
      return { className: "bg-muted text-muted-foreground", label: status || "Tidak diketahui" };
  }
};

const formatDateTime = (value: string) =>
  format(new Date(value), "dd MMM yyyy • HH:mm", { locale: localeID });

export const MobilePaymentHistory = memo(() => {
  const { organizationId } = useCurrentOrg();

  const { data: payments = [], isLoading, isError, refetch } = useQuery<PaymentRecord[]>({
    queryKey: ["payment-history", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select(
          `
          id,
          amount,
          status,
          created_at,
          order_id,
          billing_cycle,
          notes,
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
      doc.text(`Tanggal: ${formatDateTime(payment.created_at)}`, infoX, 47);
      doc.text(`Status: ${payment.status}`, infoX, 53);

      doc.text("Tagihan untuk:", margin, 70);
      doc.setFont("helvetica", "bold");
      doc.text(orgData?.company_name || "Perusahaan Anda", margin, 76);
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
    },
    [organizationId],
  );

  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Riwayat Pembayaran</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Memuat transaksi subscription terbaru...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingDots size="lg" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Gagal memuat riwayat pembayaran</CardTitle>
          <CardDescription className="text-xs text-destructive">
            Periksa koneksi Anda atau coba beberapa saat lagi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Coba lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!payments.length) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Riwayat Pembayaran</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Belum ada transaksi pembayaran yang tercatat.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground">
          <History className="h-8 w-8 text-muted-foreground/60" />
          <p>Riwayat pembayaran akan ditampilkan di sini setelah Anda melakukan transaksi.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground">Riwayat Pembayaran</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Daftar transaksi subscription terbaru organisasi Anda.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {payments.map((payment) => {
          const badge = statusBadgeVariant(payment.status);
          return (
            <div
              key={payment.id}
              className="space-y-3 rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {payment.subscription_plans?.name || "Subscription Plan"}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{formatIDR(payment.amount)}</p>
                </div>
                <Badge className={badge.className}>{badge.label}</Badge>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>ID Transaksi</span>
                  <span className="font-medium text-foreground">{payment.order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal</span>
                  <span className="font-medium text-foreground">{formatDateTime(payment.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Siklus tagihan</span>
                  <span className="font-medium text-foreground capitalize">{payment.billing_cycle}</span>
                </div>
              </div>
              {payment.notes && (
                <div className="rounded-lg border border-border bg-background/60 p-2 text-[11px] text-muted-foreground">
                  Catatan: {payment.notes}
                </div>
              )}
              <Separator />
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center gap-2 text-xs"
                onClick={() => handleDownloadReceipt(payment)}
              >
                <Download className="h-3.5 w-3.5" />
                Unduh bukti pembayaran
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});

MobilePaymentHistory.displayName = "MobilePaymentHistory";

