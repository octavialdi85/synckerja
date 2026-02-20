-- Create trigger to auto-initialize balance when bank account is created
-- Description: Automatically creates a balance record (starting from 0) when a new bank account is created
-- Created: 2025-01-29

CREATE OR REPLACE FUNCTION initialize_bank_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert initial balance record (starting from 0)
    INSERT INTO public.bank_account_balances (
        bank_account_id,
        organization_id,
        balance
    ) VALUES (
        NEW.id,
        NEW.organization_id,
        0
    )
    ON CONFLICT (bank_account_id) DO NOTHING; -- Prevent duplicate if balance already exists
    
    -- Create initial history entry
    INSERT INTO public.bank_account_balance_history (
        bank_account_id,
        organization_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        created_by
    ) VALUES (
        NEW.id,
        NEW.organization_id,
        'initial',
        0,
        0,
        0,
        'Initial balance',
        NEW.created_by
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER initialize_bank_account_balance_trigger
    AFTER INSERT ON public.bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION initialize_bank_account_balance();

-- Add comment
COMMENT ON FUNCTION initialize_bank_account_balance() IS 'Automatically initializes balance record when a new bank account is created';
