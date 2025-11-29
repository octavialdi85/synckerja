-- Update "Parfum Import - Template Contoh" labor cost to use vendor method
-- Rate: 100.000 per jam, Units: 10 per jam
-- Clear all salary method fields (monthlySalary, workingDaysPerMonth, workingHoursPerDay, hoursPerUnit)
-- Clear all manual method fields (amount, quantity, timePeriod, manualCostPerUnit)

UPDATE pricing_templates 
SET template_data = jsonb_set(
  template_data,
  '{costBreakdown}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN category->>'id' = 'labor-cost' THEN
          jsonb_set(
            category,
            '{items}',
            (
              SELECT jsonb_agg(
                CASE 
                  WHEN item->>'name' = 'Produksi & Mixing Cairan Parfum (Indonesia)' THEN
                    -- Build new item with vendor method only, explicitly remove all salary and manual fields
                    jsonb_build_object(
                      'id', COALESCE(item->>'id', 'item-4'),
                      'name', COALESCE(item->>'name', 'Produksi & Mixing Cairan Parfum (Indonesia)'),
                      'calculationMethod', 'vendor',
                      'vendorTimePeriod', 'hourly',
                      'vendorRate', 100000,
                      'unitsPerTimePeriod', 10
                    )
                  ELSE item
                END
              )
              FROM jsonb_array_elements(category->'items') AS item
            )
          )
        ELSE category
      END
    )
    FROM jsonb_array_elements(template_data->'costBreakdown') AS category
  ),
  true
)
WHERE template_name = 'Parfum Import - Template Contoh';

