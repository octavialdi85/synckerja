-- Insert default "Jasa Digital Marketing" template (global template for all tenants)
INSERT INTO pricing_templates (
    organization_id,
    template_name,
    template_description,
    category,
    industry,
    template_data,
    is_active
) VALUES (
    NULL, -- Global template accessible by all tenants
    'Jasa Digital Marketing - Paket Maintain Social Media',
    'Template untuk perhitungan harga jasa digital marketing dengan paket maintain social media dan produksi content video. Paket ini mencakup 10 video per bulan dengan harga Rp 1.500.000. Template ini sudah termasuk marketing cost dengan ROAS 5. Struktur biaya mencakup labor cost untuk content creator dan video editor, marketing cost berbasis ROAS, serta business expenses operasional.',
    'Jasa Digital Marketing',
    'Services',
    '{
        "productName": "Paket Maintain Social Media - 10 Video/Bulan",
        "category": "Jasa Digital Marketing",
        "productionCostPerUnit": 1200000,
        "costBreakdown": [
            {
                "id": "raw-materials",
                "title": "Raw Materials",
                "color": "text-blue-600",
                "isLaborCategory": false,
                "items": []
            },
            {
                "id": "labor",
                "title": "Labor Cost",
                "color": "text-green-600",
                "isLaborCategory": true,
                "items": [
                    {
                        "id": "labor-1",
                        "name": "Content Creator",
                        "amount": 0,
                        "calculationMethod": "salary",
                        "monthlySalary": 8000000,
                        "workingDaysPerMonth": 22,
                        "workingHoursPerDay": 8,
                        "hoursPerUnit": 4,
                        "timePeriod": "hourly",
                        "quantity": 4,
                        "isForTotalBatch": false
                    },
                    {
                        "id": "labor-2",
                        "name": "Video Editor",
                        "amount": 0,
                        "calculationMethod": "salary",
                        "monthlySalary": 6000000,
                        "workingDaysPerMonth": 22,
                        "workingHoursPerDay": 8,
                        "hoursPerUnit": 3,
                        "timePeriod": "hourly",
                        "quantity": 3,
                        "isForTotalBatch": false
                    }
                ]
            },
            {
                "id": "overhead",
                "title": "Overhead",
                "color": "text-purple-600",
                "isLaborCategory": false,
                "items": [
                    {
                        "id": "overhead-1",
                        "name": "Software Editing (Adobe, Canva Pro)",
                        "amount": 0,
                        "flatRate": 200000,
                        "flatRateUnits": 10,
                        "timePeriod": "monthly",
                        "quantity": 1,
                        "isForTotalBatch": true
                    },
                    {
                        "id": "overhead-2",
                        "name": "Stock Footage & Music License",
                        "amount": 0,
                        "flatRate": 150000,
                        "flatRateUnits": 10,
                        "timePeriod": "monthly",
                        "quantity": 1,
                        "isForTotalBatch": true
                    }
                ]
            },
            {
                "id": "shipping",
                "title": "Shipping",
                "color": "text-orange-600",
                "isLaborCategory": false,
                "items": []
            },
            {
                "id": "marketing",
                "title": "Marketing Cost",
                "color": "text-pink-600",
                "isLaborCategory": false,
                "items": [
                    {
                        "id": "marketing-1",
                        "name": "Marketing Spend (ROAS 5:1)",
                        "amount": 0,
                        "marketingCalculationMethod": "roas",
                        "marketingSpend": 300000,
                        "targetROAS": 5,
                        "timePeriod": "monthly",
                        "quantity": 1,
                        "isForTotalBatch": true
                    }
                ]
            },
            {
                "id": "other-costs",
                "title": "Other Costs",
                "color": "text-gray-600",
                "isLaborCategory": false,
                "items": []
            }
        ],
        "operationalExpenses": [
            {
                "id": "exp-1",
                "category": "Gaji Karyawan",
                "name": "Gaji Social Media Manager",
                "amount": 5000000,
                "month": null
            },
            {
                "id": "exp-2",
                "category": "Sewa/Tempat Usaha",
                "name": "Sewa Co-working Space",
                "amount": 3000000,
                "month": null
            },
            {
                "id": "exp-3",
                "category": "Listrik, Air, Internet",
                "name": "Internet & Cloud Storage",
                "amount": 500000,
                "month": null
            },
            {
                "id": "exp-4",
                "category": "Equipment & Tools",
                "name": "Camera & Equipment Maintenance",
                "amount": 1000000,
                "month": null
            },
            {
                "id": "exp-5",
                "category": "Asuransi & Legal",
                "name": "Asuransi & Legal",
                "amount": 500000,
                "month": null
            }
        ],
        "totalOperationalExpenses": 10000000,
        "costAllocationMethod": "fixed-cost",
        "timePeriod": "monthly",
        "calculationMethod": "markup",
        "markupPercent": 25,
        "salesChannels": [
            {
                "id": "website",
                "name": "Website Direct",
                "type": "online",
                "commissionPercent": 0,
                "paymentFeePercent": 2,
                "adSpendPercent": 0,
                "otherFeePercent": 0,
                "totalFeePercent": 2,
                "isActive": true,
                "isDefault": true
            },
            {
                "id": "social-media",
                "name": "Social Media (Instagram, TikTok)",
                "type": "online",
                "commissionPercent": 0,
                "paymentFeePercent": 0,
                "adSpendPercent": 0,
                "otherFeePercent": 0,
                "totalFeePercent": 0,
                "isActive": true,
                "isDefault": true
            },
            {
                "id": "marketplace",
                "name": "Marketplace (Tokopedia, Shopee)",
                "type": "online",
                "commissionPercent": 5,
                "paymentFeePercent": 1,
                "adSpendPercent": 0,
                "otherFeePercent": 0,
                "totalFeePercent": 6,
                "isActive": true,
                "isDefault": true
            }
        ],
        "selectedChannels": ["website", "social-media"],
        "targetProfitPercent": 20,
        "minimumMarginPercent": 15
    }'::jsonb,
    TRUE
);

-- Add comment
COMMENT ON TABLE pricing_templates IS 
'Template "Jasa Digital Marketing - Paket Maintain Social Media" inserted for all tenants. This template serves as an example/starting point for pricing calculations in digital marketing services business, specifically for social media maintenance and video content production packages.';

