drop policy "audit_logs_select_admins" on "public"."audit_logs";

drop policy "family_backups_delete_policy" on "public"."family_backups";

drop policy "family_backups_insert_policy" on "public"."family_backups";

drop policy "family_backups_update_policy" on "public"."family_backups";

drop policy "notifications_delete" on "public"."notifications";

drop policy "notifications_insert" on "public"."notifications";

drop policy "notifications_update" on "public"."notifications";

alter table "public"."family_invites" drop constraint "family_invites_role_check";

alter table "public"."family_invites" drop constraint "family_invites_status_check";

alter table "public"."family_members" drop constraint "family_members_role_check";

alter table "public"."goals" drop constraint "goals_status_check";

alter table "public"."scheduled_exports" drop constraint "scheduled_exports_schedule_check";

alter table "public"."family_invites" add constraint "family_invites_role_check" CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying, 'viewer'::character varying])::text[]))) not valid;

alter table "public"."family_invites" validate constraint "family_invites_role_check";

alter table "public"."family_invites" add constraint "family_invites_status_check" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying])::text[]))) not valid;

alter table "public"."family_invites" validate constraint "family_invites_status_check";

alter table "public"."family_members" add constraint "family_members_role_check" CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying, 'viewer'::character varying])::text[]))) not valid;

alter table "public"."family_members" validate constraint "family_members_role_check";

alter table "public"."goals" add constraint "goals_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))) not valid;

alter table "public"."goals" validate constraint "goals_status_check";

alter table "public"."scheduled_exports" add constraint "scheduled_exports_schedule_check" CHECK (((schedule)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying])::text[]))) not valid;

alter table "public"."scheduled_exports" validate constraint "scheduled_exports_schedule_check";

create policy "audit_logs_select_admins"
on "public"."audit_logs"
as permissive
for select
to authenticated
using ((EXISTS ( SELECT 1
   FROM family_members
  WHERE ((family_members.user_id = auth.uid()) AND ((family_members.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));


create policy "family_backups_delete_policy"
on "public"."family_backups"
as permissive
for delete
to authenticated
using ((family_id IN ( SELECT fm.family_id
   FROM family_members fm
  WHERE ((fm.user_id = auth.uid()) AND ((fm.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));


create policy "family_backups_insert_policy"
on "public"."family_backups"
as permissive
for insert
to authenticated
with check ((family_id IN ( SELECT fm.family_id
   FROM family_members fm
  WHERE ((fm.user_id = auth.uid()) AND ((fm.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));


create policy "family_backups_update_policy"
on "public"."family_backups"
as permissive
for update
to authenticated
using ((family_id IN ( SELECT fm.family_id
   FROM family_members fm
  WHERE ((fm.user_id = auth.uid()) AND ((fm.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));


create policy "notifications_delete"
on "public"."notifications"
as permissive
for delete
to authenticated
using (((user_id = auth.uid()) OR (family_id IN ( SELECT family_members.family_id
   FROM family_members
  WHERE ((family_members.user_id = auth.uid()) AND ((family_members.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])))))));


create policy "notifications_insert"
on "public"."notifications"
as permissive
for insert
to authenticated
with check (((user_id = auth.uid()) OR (family_id IN ( SELECT family_members.family_id
   FROM family_members
  WHERE ((family_members.user_id = auth.uid()) AND ((family_members.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])))))));


create policy "notifications_update"
on "public"."notifications"
as permissive
for update
to authenticated
using (((user_id = auth.uid()) OR (family_id IN ( SELECT family_members.family_id
   FROM family_members
  WHERE ((family_members.user_id = auth.uid()) AND ((family_members.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])))))));



