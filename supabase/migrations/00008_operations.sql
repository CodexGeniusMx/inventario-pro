-- 00008_operations.sql
-- Document sequences and audit logs

CREATE TABLE document_sequences (
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  document_kind document_kind NOT NULL,
  last_value bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (organization_id, document_kind),
  CONSTRAINT document_sequences_last_value_nonneg CHECK (last_value >= 0)
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
  user_id uuid REFERENCES profiles (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_action_not_empty CHECK (char_length(trim(action)) > 0),
  CONSTRAINT audit_logs_entity_type_not_empty CHECK (char_length(trim(entity_type)) > 0)
);

CREATE INDEX audit_logs_organization_created_idx
  ON audit_logs (organization_id, created_at DESC);

CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_user_id_idx ON audit_logs (user_id);

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs are immutable';
END;
$$;

CREATE TRIGGER trg_audit_logs_no_update
  BEFORE UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER trg_audit_logs_no_delete
  BEFORE DELETE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE OR REPLACE FUNCTION next_document_number(
  p_organization_id uuid,
  p_document_kind document_kind
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next bigint;
  v_prefix text;
BEGIN
  INSERT INTO document_sequences (organization_id, document_kind, last_value)
  VALUES (p_organization_id, p_document_kind, 0)
  ON CONFLICT (organization_id, document_kind) DO NOTHING;

  UPDATE document_sequences
  SET last_value = last_value + 1
  WHERE organization_id = p_organization_id
    AND document_kind = p_document_kind
  RETURNING last_value INTO v_next;

  v_prefix := CASE p_document_kind
    WHEN 'sale' THEN 'S-'
    WHEN 'purchase_order' THEN 'PO-'
    WHEN 'purchase_receipt' THEN 'PR-'
    WHEN 'return' THEN 'R-'
    WHEN 'stock_adjustment' THEN 'ADJ-'
  END;

  RETURN v_prefix || lpad(v_next::text, 4, '0');
END;
$$;
