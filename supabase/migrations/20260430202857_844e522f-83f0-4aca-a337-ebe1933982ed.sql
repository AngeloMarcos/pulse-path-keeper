
-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE public.app_role AS ENUM ('hemoterapeuta', 'biomedico', 'tecnico', 'enfermeiro', 'medico', 'gestor');
CREATE TYPE public.blood_type AS ENUM ('O_NEG','O_POS','A_NEG','A_POS','B_NEG','B_POS','AB_NEG','AB_POS','NAO_TIPADO');
CREATE TYPE public.component_type AS ENUM ('CH','CP','PFC','CRIO','GV','CH_IRR','CH_LAV','CH_FIL');
CREATE TYPE public.unit_status AS ENUM ('disponivel','reservado','dispensado','transfundido','descartado','vencido');
CREATE TYPE public.pai_status AS ENUM ('negativo','positivo','pendente');
CREATE TYPE public.urgency AS ENUM ('rotina','urgencia','emergencia');
CREATE TYPE public.request_status AS ENUM ('pendente','em_analise','aguardando_amostra','pronto_dispensar','dispensado','transfundido','cancelado');
CREATE TYPE public.crossmatch_result AS ENUM ('compativel','incompativel','pendente');
CREATE TYPE public.crossmatch_method AS ENUM ('gel','tubo','microplaca','eletronico');
CREATE TYPE public.reaction_type AS ENUM ('hemolitica_aguda','hemolitica_tardia','febril_nao_hemolitica','alergica_leve','alergica_grave','trali','taco','septica','outra');
CREATE TYPE public.reaction_severity AS ENUM ('leve','moderada','grave','fatal');

-- ============================================================================
-- updated_at trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- USER_ROLES (separate table — never store roles on profiles)
-- ============================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role security definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.is_active_member(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.id
    WHERE p.id = _user_id AND p.active = true
  );
$$;

-- handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, active)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), false);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- profiles RLS
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Active members view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Users update own profile name" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Gestor manages profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'gestor')) WITH CHECK (public.has_role(auth.uid(),'gestor'));

-- user_roles RLS
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Gestor view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'gestor'));
CREATE POLICY "Gestor manages roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'gestor')) WITH CHECK (public.has_role(auth.uid(),'gestor'));

-- ============================================================================
-- PATIENTS
-- ============================================================================
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  blood_type public.blood_type NOT NULL DEFAULT 'NAO_TIPADO',
  blood_type_confirmed BOOLEAN NOT NULL DEFAULT false,
  pai_status public.pai_status,
  pai_antibodies TEXT,
  irradiation_required BOOLEAN NOT NULL DEFAULT false,
  cmv_negative_required BOOLEAN NOT NULL DEFAULT false,
  alerts TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Active members read patients" ON public.patients FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Clinical staff write patients" ON public.patients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'medico') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'medico') OR public.has_role(auth.uid(),'gestor'));

-- ============================================================================
-- BLOOD_UNITS
-- ============================================================================
CREATE TABLE public.blood_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bag_number TEXT NOT NULL UNIQUE,
  component_type public.component_type NOT NULL,
  blood_type public.blood_type NOT NULL,
  volume_ml INTEGER NOT NULL,
  expiration_date DATE NOT NULL,
  donation_number TEXT,
  irradiated BOOLEAN NOT NULL DEFAULT false,
  filtered BOOLEAN NOT NULL DEFAULT false,
  cmv_negative BOOLEAN NOT NULL DEFAULT false,
  phenotyped BOOLEAN NOT NULL DEFAULT false,
  status public.unit_status NOT NULL DEFAULT 'disponivel',
  location TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_by UUID REFERENCES public.profiles(id),
  discarded_at TIMESTAMPTZ,
  discard_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.blood_units ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER blood_units_updated_at BEFORE UPDATE ON public.blood_units FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Active members read units" ON public.blood_units FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Stock staff write units" ON public.blood_units FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'gestor'));

-- ============================================================================
-- TRANSFUSION_REQUESTS
-- ============================================================================
CREATE TABLE public.transfusion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  requesting_physician_id UUID REFERENCES public.profiles(id),
  component_type public.component_type NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  urgency public.urgency NOT NULL DEFAULT 'rotina',
  clinical_indication TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  current_hemoglobin NUMERIC(4,2),
  current_hematocrit NUMERIC(4,2),
  status public.request_status NOT NULL DEFAULT 'pendente',
  emergency_justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transfusion_requests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER transfusion_requests_updated_at BEFORE UPDATE ON public.transfusion_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Active members read requests" ON public.transfusion_requests FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Active members write requests" ON public.transfusion_requests FOR ALL TO authenticated USING (public.is_active_member(auth.uid())) WITH CHECK (public.is_active_member(auth.uid()));

-- ============================================================================
-- PRE_TRANSFUSION_TESTS
-- ============================================================================
CREATE TABLE public.pre_transfusion_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.transfusion_requests(id) ON DELETE CASCADE,
  blood_unit_id UUID REFERENCES public.blood_units(id),
  performed_by UUID REFERENCES public.profiles(id),
  recipient_abo TEXT,
  recipient_rh TEXT,
  donor_abo TEXT,
  donor_rh TEXT,
  pai_result public.pai_status,
  pai_details TEXT,
  crossmatch_result public.crossmatch_result DEFAULT 'pendente',
  crossmatch_method public.crossmatch_method,
  validated_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pre_transfusion_tests ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER ptt_updated_at BEFORE UPDATE ON public.pre_transfusion_tests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Active members read ptt" ON public.pre_transfusion_tests FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Lab staff write ptt" ON public.pre_transfusion_tests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico'));

-- ============================================================================
-- DISPENSATIONS
-- ============================================================================
CREATE TABLE public.dispensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.transfusion_requests(id) ON DELETE CASCADE,
  blood_unit_id UUID NOT NULL REFERENCES public.blood_units(id),
  dispensed_by UUID REFERENCES public.profiles(id),
  dispensed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ward TEXT,
  received_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dispensations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members read dispensations" ON public.dispensations FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Lab/stock write dispensations" ON public.dispensations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'tecnico'));

-- ============================================================================
-- TRANSFUSIONS
-- ============================================================================
CREATE TABLE public.transfusions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispensation_id UUID REFERENCES public.dispensations(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  blood_unit_id UUID NOT NULL REFERENCES public.blood_units(id),
  nurse_id UUID REFERENCES public.profiles(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  volume_transfused_ml INTEGER,
  pre_vital_signs JSONB,
  post_vital_signs JSONB,
  access_route TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transfusions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER transfusions_updated_at BEFORE UPDATE ON public.transfusions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Active members read transfusions" ON public.transfusions FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Transfusion staff write" ON public.transfusions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'enfermeiro') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'enfermeiro') OR public.has_role(auth.uid(),'tecnico') OR public.has_role(auth.uid(),'gestor'));

-- ============================================================================
-- ADVERSE_REACTIONS
-- ============================================================================
CREATE TABLE public.adverse_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfusion_id UUID REFERENCES public.transfusions(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id),
  blood_unit_id UUID REFERENCES public.blood_units(id),
  reported_by UUID REFERENCES public.profiles(id),
  reaction_type public.reaction_type NOT NULL,
  severity public.reaction_severity NOT NULL,
  symptoms TEXT,
  onset_minutes INTEGER,
  volume_at_reaction_ml INTEGER,
  transfusion_suspended BOOLEAN NOT NULL DEFAULT true,
  actions_taken TEXT,
  outcome TEXT,
  notivisa_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.adverse_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active members read reactions" ON public.adverse_reactions FOR SELECT TO authenticated USING (public.is_active_member(auth.uid()));
CREATE POLICY "Reaction staff write" ON public.adverse_reactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'enfermeiro') OR public.has_role(auth.uid(),'medico') OR public.has_role(auth.uid(),'gestor'))
  WITH CHECK (public.has_role(auth.uid(),'hemoterapeuta') OR public.has_role(auth.uid(),'biomedico') OR public.has_role(auth.uid(),'enfermeiro') OR public.has_role(auth.uid(),'medico') OR public.has_role(auth.uid(),'gestor'));

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  body TEXT,
  related_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Anyone authenticated insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================================
-- TRIGGER: notify hemoterapeutas on severe/fatal reaction
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_severe_reaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD;
BEGIN
  IF NEW.severity IN ('grave','fatal') THEN
    FOR r IN SELECT user_id FROM public.user_roles WHERE role = 'hemoterapeuta' LOOP
      INSERT INTO public.notifications (user_id, type, severity, title, body, related_id)
      VALUES (r.user_id, 'severe_reaction', 'critical',
        'Reação ' || NEW.severity || ' registrada',
        'Notificação automática: reação ' || NEW.reaction_type::text || ' (' || NEW.severity::text || ').',
        NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_severe_reaction
  AFTER INSERT ON public.adverse_reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_severe_reaction();

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_blood_units_status ON public.blood_units(status);
CREATE INDEX idx_blood_units_expiration ON public.blood_units(expiration_date);
CREATE INDEX idx_blood_units_component_blood ON public.blood_units(component_type, blood_type);
CREATE INDEX idx_requests_status ON public.transfusion_requests(status);
CREATE INDEX idx_transfusions_started ON public.transfusions(started_at);
CREATE INDEX idx_patients_name ON public.patients(full_name);
CREATE INDEX idx_patients_mrn ON public.patients(mrn);
