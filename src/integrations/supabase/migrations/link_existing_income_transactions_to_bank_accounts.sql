-- Link existing income transactions to bank accounts
-- Description: Links income transactions with payment_method = 'bank' to bank accounts
-- If there's only one active bank account in the organization, link all bank transactions to it
-- Created: 2025-01-29

DO $$
DECLARE
    v_org_record RECORD;
    v_bank_account_id UUID;
    v_bank_account_count INTEGER;
    v_updated_count INTEGER;
BEGIN
    -- Loop through all organizations
    FOR v_org_record IN 
        SELECT DISTINCT organization_id 
        FROM public.income_transactions 
        WHERE bank_account_id IS NULL 
            AND payment_method IN ('bank', 'bank_transfer', 'transfer')
    LOOP
        -- Count active bank accounts for this organization
        SELECT COUNT(*) INTO v_bank_account_count
        FROM public.bank_accounts
        WHERE organization_id = v_org_record.organization_id
            AND is_active = true;
        
        -- Only link if there's exactly one active bank account
        IF v_bank_account_count = 1 THEN
            -- Get the bank account ID
            SELECT id INTO v_bank_account_id
            FROM public.bank_accounts
            WHERE organization_id = v_org_record.organization_id
                AND is_active = true
            LIMIT 1;
            
            -- Update income transactions
            UPDATE public.income_transactions
            SET bank_account_id = v_bank_account_id,
                updated_at = NOW()
            WHERE organization_id = v_org_record.organization_id
                AND bank_account_id IS NULL
                AND payment_method IN ('bank', 'bank_transfer', 'transfer')
                AND status IN ('completed', 'pending');
            
            GET DIAGNOSTICS v_updated_count = ROW_COUNT;
            
            RAISE NOTICE 'Linked % transactions to bank account % for organization %', 
                v_updated_count, v_bank_account_id, v_org_record.organization_id;
        ELSE
            RAISE NOTICE 'Skipping organization % - has % bank accounts (need exactly 1)', 
                v_org_record.organization_id, v_bank_account_count;
        END IF;
    END LOOP;
END $$;
