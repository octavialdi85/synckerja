import { memo } from 'react';

export const PlansHeader = memo(() => {
  return (
    <div className="px-1 py-3">
      {/* Header Section */}
      <div className="mb-3">
        <h1 className="text-xl font-bold text-gray-900 mb-0.5">Pilih Paket Subscription</h1>
        <p className="text-xs text-gray-600">
          Kelola tim dan organisasi Anda dengan fitur lengkap HRIS. Pilih paket yang sesuai dengan kebutuhan perusahaan Anda.
        </p>
      </div>
    </div>
  );
});

PlansHeader.displayName = 'PlansHeader';
