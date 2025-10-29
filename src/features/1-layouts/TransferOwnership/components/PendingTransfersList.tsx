
import { Card, CardContent, CardHeader, CardTitle } from "@/features/ui/card";
import { Button } from "@/features/ui/button";
import { User } from "lucide-react";

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
  if (transfers.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-sm mt-6">
      <CardHeader>
        <CardTitle className="text-lg">Permintaan Transfer Pending</CardTitle>
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
                  Batalkan
                </Button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Dikirim: {new Date(transfer.created_at).toLocaleDateString('id-ID')}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingTransfersList;
