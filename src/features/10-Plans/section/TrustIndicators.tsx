import { memo } from 'react';
import { Shield, Users, Zap } from 'lucide-react';

export const TrustIndicators = memo(() => {
  return (
    <div className="text-center space-y-4 pt-12 border-t">
      <h3 className="text-xl font-semibold text-gray-900">Mengapa Memilih HRIS Kami?</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
        <div className="space-y-2">
          <Shield className="h-8 w-8 text-blue-600 mx-auto" />
          <h4 className="font-medium text-gray-900">Keamanan Terjamin</h4>
          <p>Data perusahaan Anda aman dengan enkripsi tingkat enterprise</p>
        </div>
        <div className="space-y-2">
          <Users className="h-8 w-8 text-blue-600 mx-auto" />
          <h4 className="font-medium text-gray-900">Support 24/7</h4>
          <p>Tim support siap membantu kapan saja Anda membutuhkan</p>
        </div>
        <div className="space-y-2">
          <Zap className="h-8 w-8 text-blue-600 mx-auto" />
          <h4 className="font-medium text-gray-900">Implementasi Cepat</h4>
          <p>Setup mudah dan cepat, langsung bisa digunakan hari ini</p>
        </div>
      </div>
    </div>
  );
});

TrustIndicators.displayName = 'TrustIndicators';
