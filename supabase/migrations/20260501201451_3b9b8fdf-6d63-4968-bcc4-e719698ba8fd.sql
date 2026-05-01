-- 1) Reforçar imutabilidade do audit_log: bloquear UPDATE e DELETE para qualquer usuário (apenas SELECT permanece para gestor; INSERT é via SECURITY DEFINER trigger)
DROP POLICY IF EXISTS "Block audit update" ON public.audit_log;
DROP POLICY IF EXISTS "Block audit delete" ON public.audit_log;

CREATE POLICY "Block audit update" ON public.audit_log
  FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Block audit delete" ON public.audit_log
  FOR DELETE TO authenticated USING (false);

-- 2) Atualizar a função de notificação de reação grave para incluir nome do paciente no corpo
CREATE OR REPLACE FUNCTION public.notify_severe_reaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_patient_name text;
BEGIN
  IF NEW.severity IN ('grave','fatal') THEN
    SELECT full_name INTO v_patient_name FROM public.patients WHERE id = NEW.patient_id;

    FOR r IN SELECT user_id FROM public.user_roles WHERE role = 'hemoterapeuta' LOOP
      INSERT INTO public.notifications (user_id, type, severity, title, body, related_id)
      VALUES (
        r.user_id,
        'reaction_alert',
        NEW.severity::text,
        'Reação ' || NEW.severity::text || ' registrada',
        COALESCE(v_patient_name, 'Paciente') || ' — reação ' || NEW.reaction_type::text || ' (' || NEW.severity::text || ').',
        NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;