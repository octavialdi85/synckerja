-- Update "Parfum Import - Template Contoh" to include cost breakdown detail
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
          "quantity": 8
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
      "title": "Shipping",
      "items": [
        {
          "id": "item-8",
          "name": "Shipping China → Indonesia (Flat Rate)",
          "amount": 15000
        },
        {
          "id": "item-9",
          "name": "Customs/Import Duty/Handling Fee",
          "amount": 5000
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
)
WHERE template_name = 'Parfum Import - Template Contoh';

-- Also update totalProductionCost to reflect the actual total
-- Total = (5000 + 2000 + 3000) + (15000 * 8) + (1000 + 2000 + 500) + (15000 + 5000)
-- Total = 10000 + 120000 + 3500 + 20000 = 153500
UPDATE pricing_templates 
SET template_data = jsonb_set(
  template_data, 
  '{totalProductionCost}', 
  '153500'::jsonb,
  true
)
WHERE template_name = 'Parfum Import - Template Contoh';

