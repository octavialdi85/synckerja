-- Insert default "Parfum Import" template (global template for all tenants)
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
    'Parfum Import - Template Contoh',
    'Template contoh untuk perhitungan harga parfum import. Botol, tutup, dan spray dibeli di China. Cairan diproduksi di Indonesia (termasuk labor cost). Packaging (label, box, wrapping) diproduksi di China. Shipping dari China ke Indonesia menggunakan flat rate. Template ini berisi contoh struktur biaya dan pengeluaran operasional yang umum digunakan untuk bisnis parfum import.',
    'Parfum Import',
    'Manufacturing',
    '{
        "productName": "Parfum Import Premium",
        "category": "Manufacturing",
        "totalProductionCost": 0,
        "productionUnits": 1000,
        "operationalExpenses": [
            {
                "id": "exp-1",
                "category": "Gaji Karyawan",
                "name": "Gaji Karyawan 1",
                "amount": 5000000,
                "month": null
            },
            {
                "id": "exp-2",
                "category": "Gaji Karyawan",
                "name": "Gaji Karyawan 2",
                "amount": 4500000,
                "month": null
            },
            {
                "id": "exp-3",
                "category": "Sewa/Tempat Usaha",
                "name": "Sewa Ruko Bulanan",
                "amount": 15000000,
                "month": null
            },
            {
                "id": "exp-4",
                "category": "Listrik, Air, Internet",
                "name": "Listrik",
                "amount": 2000000,
                "month": null
            },
            {
                "id": "exp-5",
                "category": "Listrik, Air, Internet",
                "name": "Air",
                "amount": 500000,
                "month": null
            },
            {
                "id": "exp-6",
                "category": "Listrik, Air, Internet",
                "name": "Internet",
                "amount": 500000,
                "month": null
            },
            {
                "id": "exp-7",
                "category": "Marketing & Advertising",
                "name": "Budget Marketing Bulanan",
                "amount": 5000000,
                "month": null
            },
            {
                "id": "exp-8",
                "category": "Maintenance & Repair",
                "name": "Maintenance Bulanan",
                "amount": 1000000,
                "month": null
            },
            {
                "id": "exp-9",
                "category": "Asuransi & Legal",
                "name": "Asuransi",
                "amount": 2000000,
                "month": null
            }
        ],
        "totalOperationalExpenses": 35000000,
        "costAllocationMethod": "fixed-cost",
        "timePeriod": "monthly",
        "calculationMethod": "markup",
        "markupPercent": 50,
        "salesChannels": [
            {
                "id": "tokopedia",
                "name": "Tokopedia",
                "type": "online",
                "commissionPercent": 1.5,
                "paymentFeePercent": 0.7,
                "adSpendPercent": 1,
                "otherFeePercent": 0,
                "totalFeePercent": 3.2,
                "isActive": true,
                "isDefault": true
            },
            {
                "id": "shopee",
                "name": "Shopee",
                "type": "online",
                "commissionPercent": 1.5,
                "paymentFeePercent": 0.7,
                "adSpendPercent": 1.5,
                "otherFeePercent": 0,
                "totalFeePercent": 3.7,
                "isActive": true,
                "isDefault": true
            },
            {
                "id": "offline-store",
                "name": "Offline Store",
                "type": "offline",
                "commissionPercent": 0,
                "paymentFeePercent": 0,
                "adSpendPercent": 0,
                "otherFeePercent": 5,
                "totalFeePercent": 5,
                "isActive": true,
                "isDefault": true
            }
        ],
        "selectedChannels": ["tokopedia", "shopee", "offline-store"],
        "targetProfitPercent": 10,
        "minimumMarginPercent": 15
    }'::jsonb,
    TRUE
);

-- Add comment
COMMENT ON TABLE pricing_templates IS 
'Default template "Parfum Import" inserted for all tenants. This template serves as an example/starting point for pricing calculations in the perfume import business. Users should modify the data according to their actual costs and expenses.';

