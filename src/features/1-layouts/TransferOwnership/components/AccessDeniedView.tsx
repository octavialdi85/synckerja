
import { AlertTriangle } from "lucide-react";
import Header from "@/features/1-layouts/header/Header";

const AccessDeniedView = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Akses Ditolak</h1>
          <p className="text-gray-600">Hanya owner yang dapat mengakses halaman ini.</p>
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedView;
