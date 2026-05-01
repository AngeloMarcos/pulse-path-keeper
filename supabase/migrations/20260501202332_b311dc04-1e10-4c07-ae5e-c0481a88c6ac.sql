CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_table text,
  p_record_id uuid,
  p_action text,
  p_old jsonb DEFAULT NULL,
  p_new jsonb DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, performed_by)
  VALUES (p_table, COALESCE(p_record_id::text, ''), p_action, p_old, p_new, auth.uid())
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_audit_log(text, uuid, text, jsonb, jsonb) TO authenticated;