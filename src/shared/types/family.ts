import type { Family, FamilyMember, FamilyInvite } from '../../integrations/supabase/types';

export type FamilySummary = {
  id: string;
  name: string;
  description?: string | null;
  createdAt?: string;
};

export type FamilyMemberSummary = {
  id: string;
  userId: string;
  familyId: string;
  role: string;
  joinedAt?: string;
  status?: string;
};

export type FamilyInviteSummary = {
  id: string;
  familyId: string;
  email: string;
  role: string;
  status: string;
  invitedBy?: string | null;
};

export const mapFamilyToSummary = (f: Family): FamilySummary => ({
  id: f.id,
  name: (f as any).nome ?? (f as any).name ?? '',
  description: (f as any).description ?? null,
  createdAt: (f as any).created_at ?? undefined,
});

export const mapMemberToSummary = (m: FamilyMember): FamilyMemberSummary => ({
  id: m.id,
  userId: m.user_id,
  familyId: m.family_id,
  role: (m as any).role ?? '',
  joinedAt: (m as any).joined_at ?? undefined,
  status: (m as any).status ?? undefined,
});

export const mapInviteToSummary = (i: FamilyInvite): FamilyInviteSummary => ({
  id: i.id,
  familyId: i.family_id,
  email: i.email,
  role: i.role,
  status: i.status,
  invitedBy: (i as any).invited_by ?? null,
}); 