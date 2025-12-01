-- Update template dengan angka cost breakdown yang lebih realistis untuk parfum import
-- Menggunakan angka yang lebih masuk akal untuk bisnis parfum import premium

-- Perhitungan yang realistis:
-- Raw Materials per unit: 12.000 + 7.000 = 19.000
-- Labor per unit: (20.000/jam × 20 jam untuk total batch) ÷ 1000 = 400
-- Packaging per unit: 2.000 + 5.000 + 1.000 = 8.000
-- Shipping per unit: (40.000 + 20.000 flat rate) ÷ 1000 = 60
-- Total per unit = 19.000 + 400 + 8.000 + 60 = 27.460
-- Total untuk 1000 unit = 27.460 × 1000 = 27.460.000

UPDATE pricing_templates 
SET template_data = jsonb_set(
  jsonb_set(
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
            "amount": 20000,
            "timePeriod": "hourly",
            "quantity": 20,
            "isForTotalBatch": true
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
        "title": "Shipping (Flat Rate ÷ Production Units)",
        "items": [
          {
            "id": "item-8",
            "name": "Shipping Fragile Goods China → Indonesia (Flat Rate: Rp 40.000 ÷ 1000 unit)",
            "amount": 40
          },
          {
            "id": "item-9",
            "name": "Customs/Import Duty/Handling Fee Fragile Goods (Flat Rate: Rp 20.000 ÷ 1000 unit)",
            "amount": 20
          }
        ],
        "color": "text-orange-600"
      },
      {
        "id": "overhead",
        "title": "Overhead",
        "items": [],
        "color": "text-purple-600"
      },
      {
        "id": "admin-cost",
        "title": "Admin Cost",
        "items": [],
        "color": "text-orange-600"
      },
      {
        "id": "marketing-cost",
        "title": "Marketing Cost",
        "items": [],
        "color": "text-red-600"
      },
      {
        "id": "other-cost",
        "title": "Other Costs",
        "items": [],
        "color": "text-gray-600"
      }
    ]'::jsonb,
    true
  ),
  '{totalProductionCost}',
  '27460000'::jsonb,
  true
)
WHERE template_name = 'Parfum Import - Template Contoh';


