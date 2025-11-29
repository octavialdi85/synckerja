-- Update labor cost item untuk menggunakan monthly salary calculation
-- Perhitungan untuk parfum:
-- Gaji: Rp 8.000.000/bulan
-- Hari kerja: 22 hari/bulan
-- Jam kerja: 8 jam/hari
-- Cost per jam = 8.000.000 ÷ (22 × 8) = Rp 45.455/jam
-- Jam kerja per unit: 0.02 jam (1.2 menit untuk mixing/filling 1 botol)
-- Cost per unit = 45.455 × 0.02 = Rp 909 per unit

UPDATE pricing_templates 
SET template_data = jsonb_set(
  template_data,
  '{costBreakdown,1,items,0}',
  jsonb_build_object(
    'id', 'item-4',
    'name', 'Produksi & Mixing Cairan Parfum (Indonesia)',
    'amount', 45455, -- Rate per jam (backup calculation)
    'timePeriod', 'hourly',
    'quantity', 0.02, -- Hours per unit (backup calculation)
    'monthlySalary', 8000000, -- 8 juta per bulan
    'workingDaysPerMonth', 22,
    'workingHoursPerDay', 8,
    'hoursPerUnit', 0.02 -- 1.2 menit per botol (realistis untuk mixing/filling)
  ),
  true
)
WHERE template_name = 'Parfum Import - Template Contoh';

