
-- Add two new reaction_type values
ALTER TYPE reaction_type ADD VALUE IF NOT EXISTS 'anafilaxia';
ALTER TYPE reaction_type ADD VALUE IF NOT EXISTS 'hipotensao_bradicinina';

-- Add columns to adverse_reactions for full FIT form data
ALTER TABLE public.adverse_reactions
  ADD COLUMN IF NOT EXISTS notifying_nurse text,
  ADD COLUMN IF NOT EXISTS attending_physician text,
  ADD COLUMN IF NOT EXISTS reaction_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS volume_until_reaction_ml integer,
  ADD COLUMN IF NOT EXISTS clinical_evolution text,
  ADD COLUMN IF NOT EXISTS recommendations text,
  ADD COLUMN IF NOT EXISTS final_classification reaction_type,
  ADD COLUMN IF NOT EXISTS hemoterapeuta_crm text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aberta';

-- Integration settings table (singleton-like)
CREATE TABLE IF NOT EXISTS public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL UNIQUE, -- 'his' or 'lis'
  endpoint_url text,
  auth_token text,
  system_id text,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  field_mapping jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hemo/gestor read integration_settings"
  ON public.integration_settings FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'hemoterapeuta') OR has_role(auth.uid(),'gestor'));

CREATE POLICY "Hemo/gestor write integration_settings"
  ON public.integration_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'hemoterapeuta') OR has_role(auth.uid(),'gestor'))
  WITH CHECK (has_role(auth.uid(),'hemoterapeuta') OR has_role(auth.uid(),'gestor'));

CREATE TRIGGER trg_integration_settings_updated
  BEFORE UPDATE ON public.integration_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.integration_settings (kind, features) VALUES
  ('his', '{"receive_requests":true,"send_transfusion":true,"receive_surgery_map":false,"send_fit":true}'::jsonb),
  ('lis', '{"autofill_hb_ht":true,"receive_investigation":true,"send_reaction":false}'::jsonb)
ON CONFLICT (kind) DO NOTHING;
