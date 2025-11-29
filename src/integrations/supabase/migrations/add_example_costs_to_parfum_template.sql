-- Tambahkan contoh data untuk Overhead, Admin Cost, Marketing Cost, dan Other Cost
-- Ini akan membantu tenant yang masih belum memahami cara mengisi form

-- Update seluruh costBreakdown dengan menambahkan contoh items untuk kategori yang kosong
UPDATE pricing_templates 
SET template_data = jsonb_set(
  template_data,
  '{costBreakdown}',
  '[
    {
      "id": "raw-materials",
      "title": "Raw Materials",
      "items": [
        {
          "id": "item-1",
          "name": "Botol Kaca Premium (China)",
          "amount": 12000
        },
        {
          "id": "item-2",
          "name": "Tutup & Spray Mechanism (China)",
          "amount": 7000
        }
      ],
      "color": "text-blue-600"
    },
    {
      "id": "labor-cost",
      "title": "Labor Cost",
      "items": [
        {
          "id": "item-4",
          "name": "Produksi & Mixing Cairan Parfum (Indonesia)",
          "amount": 45455,
          "quantity": 0.02,
          "timePeriod": "hourly",
          "hoursPerUnit": 4,
          "monthlySalary": 8000000,
          "workingHoursPerDay": 8,
          "workingDaysPerMonth": 22,
          "calculationMethod": "salary"
        }
      ],
      "color": "text-green-600",
      "isLaborCategory": true
    },
    {
      "id": "packaging",
      "title": "Packaging",
      "items": [
        {
          "id": "item-5",
          "name": "Label Premium (China)",
          "amount": 2000
        },
        {
          "id": "item-6",
          "name": "Box Premium dengan Foam (China)",
          "amount": 5000
        },
        {
          "id": "item-7",
          "name": "Bubble Wrap & Protection (China)",
          "amount": 1000
        }
      ],
      "color": "text-purple-600"
    },
    {
      "id": "shipping",
      "title": "Shipping (Flat Rate + Production Units)",
      "items": [
        {
          "id": "item-8",
          "name": "Shipping Fragile Goods China → Indonesia (Flat Rate: Rp 40.000 + 1000 unit)",
          "amount": 40,
          "flatRate": 40000,
          "flatRateUnits": 1000
        },
        {
          "id": "item-9",
          "name": "Customs/Import Duty/Handling Fee Fragile Goods (Flat Rate: Rp 20.000 + 1000 unit)",
          "amount": 20,
          "flatRate": 20000,
          "flatRateUnits": 1000
        }
      ],
      "color": "text-orange-600"
    },
    {
      "id": "overhead",
      "title": "Overhead",
      "items": [
        {
          "id": "overhead-1",
          "name": "Listrik Pabrik/Workshop (per bulan)",
          "amount": 3000000,
          "quantity": 1
        },
        {
          "id": "overhead-2",
          "name": "Air untuk Produksi (per bulan)",
          "amount": 800000,
          "quantity": 1
        },
        {
          "id": "overhead-3",
          "name": "Gas/BBM untuk Mesin Produksi (per bulan)",
          "amount": 1500000,
          "quantity": 1
        },
        {
          "id": "overhead-4",
          "name": "Depresiasi Mesin & Peralatan (per bulan)",
          "amount": 2000000,
          "quantity": 1
        }
      ],
      "color": "text-purple-600"
    },
    {
      "id": "admin-cost",
      "title": "Admin Cost",
      "items": [
        {
          "id": "admin-1",
          "name": "Gaji Admin/Staff Kantor (per bulan)",
          "amount": 4500000,
          "quantity": 1
        },
        {
          "id": "admin-2",
          "name": "Software & Tools Administrasi (per bulan)",
          "amount": 500000,
          "quantity": 1
        },
        {
          "id": "admin-3",
          "name": "Konsultan Akuntansi/Hukum (per bulan)",
          "amount": 1000000,
          "quantity": 1
        },
        {
          "id": "admin-4",
          "name": "Biaya Bank & Transaksi (per bulan)",
          "amount": 300000,
          "quantity": 1
        }
      ],
      "color": "text-orange-600"
    },
    {
      "id": "marketing-cost",
      "title": "Marketing Cost",
      "items": [
        {
          "id": "marketing-1",
          "name": "Digital Marketing (Google Ads, Meta Ads - per bulan)",
          "amount": 5000000,
          "quantity": 1
        },
        {
          "id": "marketing-2",
          "name": "Content Creator/Influencer (per bulan)",
          "amount": 3000000,
          "quantity": 1
        },
        {
          "id": "marketing-3",
          "name": "Fotografi Produk & Konten Visual (per bulan)",
          "amount": 1500000,
          "quantity": 1
        },
        {
          "id": "marketing-4",
          "name": "Event & Promosi (per bulan)",
          "amount": 2000000,
          "quantity": 1
        }
      ],
      "color": "text-red-600"
    },
    {
      "id": "other-cost",
      "title": "Other Costs",
      "items": [
        {
          "id": "other-1",
          "name": "Asuransi Bisnis & Produk (per bulan)",
          "amount": 2000000,
          "quantity": 1
        },
        {
          "id": "other-2",
          "name": "Maintenance & Perbaikan (per bulan)",
          "amount": 1000000,
          "quantity": 1
        },
        {
          "id": "other-3",
          "name": "Training & Development (per bulan)",
          "amount": 1500000,
          "quantity": 1
        },
        {
          "id": "other-4",
          "name": "Biaya Lain-lain (Miscellaneous - per bulan)",
          "amount": 500000,
          "quantity": 1
        }
      ],
      "color": "text-gray-600"
    }
  ]'::jsonb,
  true
)
WHERE template_name = 'Parfum Import - Template Contoh';

