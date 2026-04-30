
-- ============================================================
-- DROP everything (in dependency order)
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.his_lis_events CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.adverse_reactions CASCADE;
DROP TABLE IF EXISTS public.transfusions CASCADE;
DROP TABLE IF EXISTS public.dispensations CASCADE;
DROP TABLE IF EXISTS public.pre_transfusion_tests CASCADE;
DROP TABLE IF EXISTS public.surgical_reservations CASCADE;
DROP TABLE IF EXISTS public.transfusion_requests CASCADE;
DROP TABLE IF EXISTS public.blood_units CASCADE;
DROP TABLE IF EXISTS public.patients CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_any_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_active_member(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.notify_severe_reaction() CASCADE;
DROP FUNCTION IF EXISTS public.audit_trigger() CASCADE;

DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.blood_type CASCADE;
DROP TYPE IF EXISTS public.component_type CASCADE;
DROP TYPE IF EXISTS public.unit_status CASCADE;
DROP TYPE IF EXISTS public.urgency CASCADE;
DROP TYPE IF EXISTS public.request_status CASCADE;
DROP TYPE IF EXISTS public.pai_status CASCADE;
DROP TYPE IF EXISTS public.pai_result CASCADE;
DROP TYPE IF EXISTS public.crossmatch_result CASCADE;
DROP TYPE IF EXISTS public.crossmatch_method CASCADE;
DROP TYPE IF EXISTS public.reaction_type CASCADE;
DROP TYPE IF EXISTS public.reaction_severity CASCADE;
DROP TYPE IF EXISTS public.surgical_reservation_status CASCADE;
DROP TYPE IF EXISTS public.integration_type CASCADE;
DROP TYPE IF EXISTS public.integration_direction CASCADE;
DROP TYPE IF EXISTS public.integration_status CASCADE;

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('hemoterapeuta','biomedico','tecnico','enfermeiro','medico','gestor');
CREATE TYPE public.blood_type AS ENUM ('A_POS','A_NEG','B_POS','B_NEG','AB_POS','AB_NEG','O_POS','O_NEG','NAO_TIPADO');
CREATE TYPE public.component_type AS ENUM ('CH','CP','PFC','CRIO','GV','CH_IRR','CH_LAV','CH_FIL');
CREATE TYPE public.unit_status AS ENUM ('disponivel','reservado','dispensado','transfundido','descartado','vencido');
CREATE TYPE public.urgency AS ENUM ('rotina','urgencia','emergencia','emergencia_absoluta');
CREATE TYPE public.request_status AS ENUM ('pendente','em_analise','aguardando_amostra','testes_em_andamento','pronto_dispensar','dispensado','transfundindo','concluido','cancelado');
CREATE TYPE public.pai_status AS ENUM ('negativo','positivo','pendente');
CREATE TYPE public.pai_result AS ENUM ('negativo','positivo','em_andamento');
CREATE TYPE public.crossmatch_result AS ENUM ('compativel','incompativel','nao_realizado');
CREATE TYPE public.crossmatch_method AS ENUM ('gel','tubo','microplaca','eletronico');
CREATE TYPE public.reaction_type AS ENUM ('rfnh','alergica_leve','alergica_grave','hemolitica_aguda','hemolitica_tardia','trali','taco','bacteriana','hipotensao','outra');
CREATE TYPE public.reaction_severity AS ENUM ('leve','moderada','grave','fatal');
CREATE TYPE public.surgical_reservation_status AS ENUM ('reservado','confirmado','cancelado','realizado');
CREATE TYPE public.integration_type AS ENUM ('HIS','LIS');
CREATE TYPE public.integration_direction AS ENUM ('send','receive');
CREATE TYPE public.integration_status AS ENUM ('success','error');

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============================================================
-- PROFILES (1:1 with auth.users — role lives in user_roles)
-- ============================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  registro_profissional text,
  setor text,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- USER_ROLES (separate table — required pattern)
-- ============================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role / is_active_member
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_active_member(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.id
    WHERE p.id = _user_id AND p.active = true
  );
$$;

-- handle_new_user trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, active)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
          false);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn text NOT NULL UNIQUE,
  full_name text NOT NULL,
  cpf text,
  birth_date date,
  blood_type public.blood_type NOT NULL DEFAULT 'NAO_TIPADO',
  blood_type_confirmed boolean NOT NULL DEFAULT false,
  pai_status public.pai_status,
  pai_antibodies text,
  irradiation_required boolean NOT NULL DEFAULT false,
  cmv_negative_required boolean NOT NULL DEFAULT false,
  alerts text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_patients_updated BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- BLOOD UNITS
-- ============================================================
CREATE TABLE public.blood_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_number text NOT NULL UNIQUE,
  component_type public.component_type NOT NULL,
  blood_type public.blood_type NOT NULL,
  volume_ml integer NOT NULL,
  expiration_date date NOT NULL,
  donation_number text,
  irradiated boolean NOT NULL DEFAULT false,
  filtered boolean NOT NULL DEFAULT false,
  cmv_negative boolean NOT NULL DEFAULT false,
  phenotyped boolean NOT NULL DEFAULT false,
  status public.unit_status NOT NULL DEFAULT 'disponivel',
  location text,
  received_at timestamptz NOT NULL DEFAULT now(),
  received_by uuid,
  discarded_at timestamptz,
  discard_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_units ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_blood_units_updated BEFORE UPDATE ON public.blood_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TRANSFUSION REQUESTS
-- ============================================================
CREATE TABLE public.transfusion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  requesting_physician_id uuid,
  component_type public.component_type NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  urgency public.urgency NOT NULL DEFAULT 'rotina',
  clinical_indication text NOT NULL,
  diagnosis text NOT NULL,
  current_hb numeric,
  current_ht numeric,
  platelet_count integer,
  status public.request_status NOT NULL DEFAULT 'pendente',
  emergency_justification text,
  special_requirements jsonb,
  his_integration_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transfusion_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_requests_updated BEFORE UPDATE ON public.transfusion_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- SURGICAL RESERVATIONS
-- ============================================================
CREATE TABLE public.surgical_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  surgery_date date NOT NULL,
  surgery_type text,
  surgeon_name text,
  anesthesiologist_notes text,
  status public.surgical_reservation_status NOT NULL DEFAULT 'reservado',
  reserved_units jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.surgical_reservations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_surgical_updated BEFORE UPDATE ON public.surgical_reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- PRE-TRANSFUSION TESTS
-- ============================================================
CREATE TABLE public.pre_transfusion_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  blood_unit_id uuid,
  performed_by uuid,
  recipient_abo text,
  recipient_rh text,
  donor_abo text,
  donor_rh text,
  pai_result public.pai_result,
  pai_antibody_identified text,
  crossmatch_result public.crossmatch_result DEFAULT 'nao_realizado',
  crossmatch_method public.crossmatch_method,
  crossmatch_notes text,
  checklist jsonb,
  validated_by uuid,
  validated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pre_transfusion_tests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_ptt_updated BEFORE UPDATE ON public.pre_transfusion_tests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- DISPENSATIONS
-- ============================================================
CREATE TABLE public.dispensations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  blood_unit_id uuid NOT NULL,
  dispensed_by uuid,
  dispensed_at timestamptz NOT NULL DEFAULT now(),
  ward text,
  received_by_name text,
  bag_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dispensations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- TRANSFUSIONS
-- ============================================================
CREATE TABLE public.transfusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispensation_id uuid,
  patient_id uuid NOT NULL,
  blood_unit_id uuid NOT NULL,
  nurse_id uuid,
  at_technician_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  volume_transfused_ml integer,
  access_route text,
  vital_signs jsonb,
  intercurrence boolean NOT NULL DEFAULT false,
  intercurrence_description text,
  transfusion_suspended boolean NOT NULL DEFAULT false,
  bag_destination text,
  completed boolean NOT NULL DEFAULT false,
  his_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transfusions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_transfusions_updated BEFORE UPDATE ON public.transfusions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ADVERSE REACTIONS
-- ============================================================
CREATE TABLE public.adverse_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transfusion_id uuid,
  patient_id uuid NOT NULL,
  blood_unit_id uuid,
  reported_by uuid,
  notification_datetime timestamptz NOT NULL DEFAULT now(),
  notifying_unit text,
  symptoms jsonb,
  reaction_type public.reaction_type NOT NULL,
  severity public.reaction_severity NOT NULL,
  outcome text,
  actions_taken jsonb,
  lab_results jsonb,
  hemoterapeuta_name text,
  hemoterapeuta_notified_at timestamptz,
  hemoterapeuta_conclusion text,
  notivisa_sent boolean NOT NULL DEFAULT false,
  notivisa_protocol text,
  closed_by uuid,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.adverse_reactions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HIS/LIS EVENTS
-- ============================================================
CREATE TABLE public.his_lis_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type public.integration_type NOT NULL,
  direction public.integration_direction NOT NULL,
  endpoint text,
  payload jsonb,
  response jsonb,
  status public.integration_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.his_lis_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  body text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- AUDIT LOG (insert-only)
-- ============================================================
CREATE TABLE public.audit_log (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_old jsonb;
  v_new jsonb;
  v_id  text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD); v_new := NULL;
    v_id  := COALESCE((to_jsonb(OLD)->>'id'),'');
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD); v_new := to_jsonb(NEW);
    v_id  := COALESCE((to_jsonb(NEW)->>'id'),'');
  ELSE
    v_old := NULL; v_new := to_jsonb(NEW);
    v_id  := COALESCE((to_jsonb(NEW)->>'id'),'');
  END IF;
  INSERT INTO public.audit_log (table_name, record_id, action, old_data, new_data, performed_by)
  VALUES (TG_TABLE_NAME, v_id, TG_OP, v_old, v_new, auth.uid());
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER aud_blood_units AFTER INSERT OR UPDATE OR DELETE ON public.blood_units
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER aud_requests AFTER INSERT OR UPDATE OR DELETE ON public.transfusion_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER aud_ptt AFTER INSERT OR UPDATE OR DELETE ON public.pre_transfusion_tests
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER aud_dispensations AFTER INSERT OR UPDATE OR DELETE ON public.dispensations
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER aud_transfusions AFTER INSERT OR UPDATE OR DELETE ON public.transfusions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
CREATE TRIGGER aud_reactions AFTER INSERT OR UPDATE OR DELETE ON public.adverse_reactions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ============================================================
-- SEVERE REACTION NOTIFICATION TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_severe_reaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.severity IN ('grave','fatal') THEN
    FOR r IN SELECT user_id FROM public.user_roles WHERE role = 'hemoterapeuta' LOOP
      INSERT INTO public.notifications (user_id, type, severity, title, body, related_id)
      VALUES (r.user_id, 'severe_reaction', 'critical',
        'Reação ' || NEW.severity || ' registrada',
        'Reação ' || NEW.reaction_type::text || ' (' || NEW.severity::text || ').',
        NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_notify_severe_reaction AFTER INSERT ON public.adverse_reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_severe_reaction();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Active members view profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Gestor manages profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gestor')) WITH CHECK (public.has_role(auth.uid(),'gestor'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Gestor view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'gestor'));
CREATE POLICY "Gestor manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'gestor')) WITH CHECK (public.has_role(auth.uid(),'gestor'));

-- patients
CREATE POLICY "Active members read patients" ON public.patients FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Clinical staff write patients" ON public.patients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'medico') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'medico') OR public.has_role(auth.uid(),'gestor'));

-- blood_units
CREATE POLICY "Active members read units" ON public.blood_units FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Stock staff write units" ON public.blood_units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'gestor'));

-- transfusion_requests
CREATE POLICY "Active members read requests" ON public.transfusion_requests FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Active members write requests" ON public.transfusion_requests FOR ALL TO authenticated
  USING (public.is_active_member(auth.uid())) WITH CHECK (public.is_active_member(auth.uid()));

-- surgical_reservations
CREATE POLICY "Active members read surgical" ON public.surgical_reservations FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Surgical staff write" ON public.surgical_reservations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'medico') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'medico') OR public.has_role(auth.uid(),'gestor'));

-- pre_transfusion_tests
CREATE POLICY "Active members read ptt" ON public.pre_transfusion_tests FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Lab staff write ptt" ON public.pre_transfusion_tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico'));

-- dispensations
CREATE POLICY "Active members read dispensations" ON public.dispensations FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Lab/stock write dispensations" ON public.dispensations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico'));

-- transfusions
CREATE POLICY "Active members read transfusions" ON public.transfusions FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Transfusion staff write" ON public.transfusions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'enfermeiro') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'enfermeiro') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'gestor'));

-- adverse_reactions
CREATE POLICY "Active members read reactions" ON public.adverse_reactions FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Reaction staff write" ON public.adverse_reactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'enfermeiro') OR public.has_role(auth.uid(),'medico') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'enfermeiro') OR public.has_role(auth.uid(),'medico') OR public.has_role(auth.uid(),'gestor'));

-- his_lis_events
CREATE POLICY "Hemo/gestor read his_lis" ON public.his_lis_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'gestor'));
CREATE POLICY "Hemo/gestor write his_lis" ON public.his_lis_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'gestor'));

-- notifications
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Active members insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member(auth.uid()) OR user_id = auth.uid());

-- audit_log: insert-only via SECURITY DEFINER triggers; gestor pode ler.
CREATE POLICY "Gestor reads audit" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'gestor'));
-- Sem policy de INSERT/UPDATE/DELETE direto (apenas trigger SECURITY DEFINER grava).

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_units_status ON public.blood_units(status);
CREATE INDEX idx_units_expiration ON public.blood_units(expiration_date);
CREATE INDEX idx_units_blood_component ON public.blood_units(component_type, blood_type);
CREATE INDEX idx_requests_status ON public.transfusion_requests(status);
CREATE INDEX idx_requests_patient ON public.transfusion_requests(patient_id);
CREATE INDEX idx_transfusions_started ON public.transfusions(started_at);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at);
CREATE INDEX idx_audit_table_record ON public.audit_log(table_name, record_id);
