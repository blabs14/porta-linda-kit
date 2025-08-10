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

function getString(obj: unknown, key: string): string | undefined {
  if (obj && typeof obj === 'object') {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === 'string') return value;
  }
  return undefined;
}

export const mapFamilyToSummary = (f: Family): FamilySummary => ({
  id: f.id,
  name: getString(f, 'nome') ?? getString(f, 'name') ?? '',
  description: ((): string | null => {
    const v = (f as unknown as Record<string, unknown>)['description'];
    return typeof v === 'string' ? v : null;
  })(),
  createdAt: getString(f, 'created_at'),
});

export const mapMemberToSummary = (m: FamilyMember): FamilyMemberSummary => ({
  id: m.id,
  userId: m.user_id,
  familyId: m.family_id,
  role: getString(m, 'role') ?? '',
  joinedAt: getString(m, 'joined_at'),
  status: getString(m, 'status'),
});

export const mapInviteToSummary = (i: FamilyInvite): FamilyInviteSummary => ({
  id: i.id,
  familyId: i.family_id,
  email: i.email,
  role: i.role,
  status: i.status,
  invitedBy: getString(i, 'invited_by') ?? null,
}); 