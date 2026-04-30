
ALTER FUNCTION public.set_updated_at() SET search_path = public;

DROP POLICY "Anyone authenticated insert notifications" ON public.notifications;
CREATE POLICY "Active members insert notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_active_member(auth.uid()) OR user_id = auth.uid());
