-- Migração: Reforço das políticas RLS
-- Data: 2024-07-11

-- 1. Separar ALL em operações específicas e adicionar restrictive
-- accounts
DROP POLICY IF EXISTS accounts_own_access ON public.accounts;
CREATE POLICY accounts_select_own ON public.accounts FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY accounts_insert_own ON public.accounts FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY accounts_update_own ON public.accounts FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY accounts_delete_own ON public.accounts FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY accounts_deny_all ON public.accounts AS RESTRICTIVE FOR ALL TO public USING (false);

-- transactions
DROP POLICY IF EXISTS transactions_all_access ON public.transactions;
CREATE POLICY transactions_select_family ON public.transactions FOR SELECT TO authenticated USING (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid()))))));
CREATE POLICY transactions_insert_family ON public.transactions FOR INSERT TO authenticated WITH CHECK (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid()))))));
CREATE POLICY transactions_update_family ON public.transactions FOR UPDATE TO authenticated USING (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid())))))) WITH CHECK (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid()))))));
CREATE POLICY transactions_delete_family ON public.transactions FOR DELETE TO authenticated USING (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid()))))));
CREATE POLICY transactions_deny_all ON public.transactions AS RESTRICTIVE FOR ALL TO public USING (false);

-- goals
DROP POLICY IF EXISTS goals_all_access ON public.goals;
CREATE POLICY goals_select_family ON public.goals FOR SELECT TO authenticated USING (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid()))))));
CREATE POLICY goals_insert_family ON public.goals FOR INSERT TO authenticated WITH CHECK (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid()))))));
CREATE POLICY goals_update_family ON public.goals FOR UPDATE TO authenticated USING (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid())))))) WITH CHECK (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid()))))));
CREATE POLICY goals_delete_family ON public.goals FOR DELETE TO authenticated USING (((auth.uid() IS NOT NULL) AND ((user_id = auth.uid()) OR (family_id IN (SELECT get_user_families(auth.uid()))))));
CREATE POLICY goals_deny_all ON public.goals AS RESTRICTIVE FOR ALL TO public USING (false);

-- fixed_expenses
DROP POLICY IF EXISTS fixed_expenses_own ON public.fixed_expenses;
CREATE POLICY fixed_expenses_select_own ON public.fixed_expenses FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY fixed_expenses_insert_own ON public.fixed_expenses FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY fixed_expenses_update_own ON public.fixed_expenses FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY fixed_expenses_delete_own ON public.fixed_expenses FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY fixed_expenses_deny_all ON public.fixed_expenses AS RESTRICTIVE FOR ALL TO public USING (false);

-- profiles
DROP POLICY IF EXISTS profiles_own_access ON public.profiles;
DROP POLICY IF EXISTS profiles_all_access ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY profiles_delete_own ON public.profiles FOR DELETE TO authenticated USING ((auth.uid() = user_id));
CREATE POLICY profiles_deny_all ON public.profiles AS RESTRICTIVE FOR ALL TO public USING (false);

-- categories
DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_select_public ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY categories_deny_all ON public.categories AS RESTRICTIVE FOR ALL TO public USING (false);

-- family_members
DROP POLICY IF EXISTS family_members_view ON public.family_members;
DROP POLICY IF EXISTS family_members_insert ON public.family_members;
DROP POLICY IF EXISTS family_members_update ON public.family_members;
DROP POLICY IF EXISTS family_members_delete ON public.family_members;
CREATE POLICY family_members_select ON public.family_members FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL) AND (family_id IN (SELECT get_user_families(auth.uid()))));
CREATE POLICY family_members_insert ON public.family_members FOR INSERT TO authenticated WITH CHECK ((family_id IN (SELECT families.id FROM families WHERE families.created_by = auth.uid())));
CREATE POLICY family_members_update ON public.family_members FOR UPDATE TO authenticated USING ((family_id IN (SELECT families.id FROM families WHERE families.created_by = auth.uid())));
CREATE POLICY family_members_delete ON public.family_members FOR DELETE TO authenticated USING (((family_id IN (SELECT families.id FROM families WHERE families.created_by = auth.uid())) OR (auth.uid() = user_id)));
CREATE POLICY family_members_deny_all ON public.family_members AS RESTRICTIVE FOR ALL TO public USING (false);

-- family_invites
DROP POLICY IF EXISTS family_invites_view ON public.family_invites;
DROP POLICY IF EXISTS family_invites_delete ON public.family_invites;
DROP POLICY IF EXISTS family_invites_create ON public.family_invites;
DROP POLICY IF EXISTS family_invites_update_invitee ON public.family_invites;
DROP POLICY IF EXISTS family_invites_update_creator ON public.family_invites;
CREATE POLICY family_invites_select ON public.family_invites FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));
CREATE POLICY family_invites_insert ON public.family_invites FOR INSERT TO authenticated WITH CHECK ((family_id IN (SELECT families.id FROM families WHERE families.created_by = auth.uid())));
CREATE POLICY family_invites_update_invitee ON public.family_invites FOR UPDATE TO authenticated USING ((((email)::text = ((SELECT users.email FROM auth.users WHERE (users.id = auth.uid())))::text) AND ((status)::text = 'pending'::text))) WITH CHECK (((status)::text = ANY ((ARRAY['accepted'::character varying, 'declined'::character varying])::text[])));
CREATE POLICY family_invites_update_creator ON public.family_invites FOR UPDATE TO authenticated USING ((family_id IN (SELECT families.id FROM families WHERE families.created_by = auth.uid())));
CREATE POLICY family_invites_delete ON public.family_invites FOR DELETE TO authenticated USING ((family_id IN (SELECT families.id FROM families WHERE families.created_by = auth.uid())));
CREATE POLICY family_invites_deny_all ON public.family_invites AS RESTRICTIVE FOR ALL TO public USING (false);

-- audit_logs
DROP POLICY IF EXISTS "Owners/Admins only" ON public.audit_logs;
CREATE POLICY audit_logs_select_admins ON public.audit_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM family_members WHERE family_members.user_id = auth.uid() AND family_members.role IN ('owner', 'admin')));
CREATE POLICY audit_logs_deny_all ON public.audit_logs AS RESTRICTIVE FOR ALL TO public USING (false);

-- debug_logs
DROP POLICY IF EXISTS debug_logs_dev_access ON public.debug_logs;
CREATE POLICY debug_logs_dev_access ON public.debug_logs FOR ALL TO authenticated USING ((current_setting('app.environment'::text, true) = 'development'::text));
CREATE POLICY debug_logs_deny_all ON public.debug_logs AS RESTRICTIVE FOR ALL TO public USING (false);

-- Fim da migração 