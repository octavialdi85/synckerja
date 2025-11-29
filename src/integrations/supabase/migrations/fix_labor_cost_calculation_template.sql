-- Fix: Perbaikan perhitungan labor cost untuk template
-- Labor cost: 8 jam adalah untuk TOTAL BATCH (1000 unit), bukan per unit
-- Labor cost per unit = (15.000/jam × 8 jam) ÷ 1000 unit = 120 per unit

-- Perhitungan yang benar:
-- Raw Materials per unit: 5.000 + 2.000 + 3.000 = 10.000
-- Labor per unit: (15.000/jam × 8 jam untuk total batch) ÷ 1000 = 120
-- Packaging per unit: 1.000 + 2.000 + 500 = 3.500
-- Shipping per unit: (15.000 + 5.000 flat rate) ÷ 1000 = 20
-- Total per unit = 10.000 + 120 + 3.500 + 20 = 13.640
-- Total untuk 1000 unit = 13.640 × 1000 = 13.640.000

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
            "name": "Botol (China)",
            "amount": 5000
          },
          {
            "id": "item-2",
            "name": "Tutup Botol (China)",
            "amount": 2000
          },
          {
            "id": "item-3",
            "name": "Spray (China)",
            "amount": 3000
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
            "name": "Produksi Cairan (Indonesia)",
            "amount": 15000,
            "timePeriod": "hourly",
            "quantity": 8,
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
            "name": "Label (China)",
            "amount": 1000
          },
          {
            "id": "item-6",
            "name": "Box (China)",
            "amount": 2000
          },
          {
            "id": "item-7",
            "name": "Wrapping (China)",
            "amount": 500
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
            "name": "Shipping China → Indonesia (Flat Rate: Rp 15.000 ÷ 1000 unit)",
            "amount": 15
          },
          {
            "id": "item-9",
            "name": "Customs/Import Duty/Handling Fee (Flat Rate: Rp 5.000 ÷ 1000 unit)",
            "amount": 5
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
  '13640000'::jsonb,
  true
)
WHERE template_name = 'Parfum Import - Template Contoh';

