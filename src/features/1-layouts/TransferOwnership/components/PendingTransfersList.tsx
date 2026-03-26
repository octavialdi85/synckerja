import { Card, CardContent, CardHeader, CardTitle } from "@/features/ui/card";
import { Button } from "@/features/ui/button";
import { User } from "lucide-react";
import { useAppTranslation } from "@/features/share/i18n/useAppTranslation";

interface PendingTransfer {
  id: string;
  created_at: string;
  message?: string;
  to_user?: {
    full_name: string;
    email: string;
  };
}

interface PendingTransfersListProps {
  transfers: PendingTransfer[];
  onCancelTransfer: (transferId: string) => void;
}

const PendingTransfersList = ({ transfers, onCancelTransfer }: PendingTransfersListProps) => {
  const { t, language } = useAppTranslation();

  if (transfers.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm mt-6">
      <CardHeader>
        <CardTitle className="text-lg">
          {t("transferOwnership.pending.title", "Pending transfer requests")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transfers.map((transfer) => (
            <div key={transfer.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{transfer.to_user?.full_name}</p>
                    <p className="text-sm text-gray-500">{transfer.to_user?.email}</p>
                    {transfer.message && (
                      <p className="text-sm text-gray-600 mt-1">{transfer.message}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancelTransfer(transfer.id)}
                >
                  {t("transferOwnership.pending.cancel", "Cancel")}
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {t("transferOwnership.pending.sent", "Sent:")}{" "}
                {new Date(transfer.created_at).toLocaleDateString(
                  language === "id" ? "id-ID" : "en-US",
                )}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingTransfersList;
