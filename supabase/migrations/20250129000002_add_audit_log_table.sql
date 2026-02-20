-- Migration: Create audit log table and trigger function
-- Description: Generic audit logging system for tracking changes to service_required_platforms
-- Created: 2025-01-29

-- Create audit schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS audit;

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    action_type TEXT NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON audit.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit.audit_logs(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_by ON audit.audit_logs(changed_by);

-- Enable RLS
ALTER TABLE audit.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit logs
CREATE POLICY "Enable read access for organization owners" 
    ON audit.audit_logs FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.active_organization_id = audit.audit_logs.organization_id
        )
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id = audit.audit_logs.organization_id 
            AND role = 'owner'
        )
    );

CREATE POLICY "Enable read access for organization admins" 
    ON audit.audit_logs FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.user_id = auth.uid()
            AND p.active_organization_id = audit.audit_logs.organization_id
        )
        AND EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND organization_id = audit.audit_logs.organization_id 
            AND role = 'admin'
        )
    );

-- Generic audit log trigger function
CREATE OR REPLACE FUNCTION audit.audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_action_type TEXT;
    v_record_id UUID;
    v_organization_id UUID;
    v_changed_by UUID;
BEGIN
    -- Get current user ID
    v_changed_by := auth.uid();

    -- Determine action type and extract data
    IF TG_OP = 'INSERT' THEN
        v_action_type := 'INSERT';
        v_new_data := to_jsonb(NEW);
        v_record_id := NEW.id;
        -- Extract organization_id from new data
        IF v_new_data ? 'organization_id' THEN
            v_organization_id := (v_new_data ->> 'organization_id')::UUID;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action_type := 'UPDATE';
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        v_record_id := NEW.id;
        -- Extract organization_id from new data (or old if new doesn't have it)
        IF v_new_data ? 'organization_id' THEN
            v_organization_id := (v_new_data ->> 'organization_id')::UUID;
        ELSIF v_old_data ? 'organization_id' THEN
            v_organization_id := (v_old_data ->> 'organization_id')::UUID;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_action_type := 'DELETE';
        v_old_data := to_jsonb(OLD);
        v_record_id := OLD.id;
        -- Extract organization_id from old data
        IF v_old_data ? 'organization_id' THEN
            v_organization_id := (v_old_data ->> 'organization_id')::UUID;
        END IF;
    END IF;

    -- Insert audit log record
    INSERT INTO audit.audit_logs (
        table_name, 
        record_id, 
        action_type, 
        old_data, 
        new_data, 
        changed_by, 
        organization_id
    )
    VALUES (
        TG_TABLE_NAME::TEXT, 
        v_record_id, 
        v_action_type, 
        v_old_data, 
        v_new_data, 
        v_changed_by, 
        v_organization_id
    );

    -- Return appropriate value based on trigger operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on service_required_platforms table
DROP TRIGGER IF EXISTS service_required_platforms_audit_log_trigger ON public.service_required_platforms;

CREATE TRIGGER service_required_platforms_audit_log_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.service_required_platforms
    FOR EACH ROW
    EXECUTE FUNCTION audit.audit_log_trigger();

-- Add comments for documentation
COMMENT ON SCHEMA audit IS 'Schema for audit logging tables and functions';
COMMENT ON TABLE audit.audit_logs IS 'Stores audit logs for all tracked tables. Records INSERT, UPDATE, and DELETE operations with old and new data.';
COMMENT ON FUNCTION audit.audit_log_trigger() IS 'Generic trigger function for audit logging. Can be attached to any table to track changes.';

