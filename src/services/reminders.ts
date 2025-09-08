import { supabase } from '../lib/supabaseClient';

// Tipos de payload aceites (compatibilidade entre UI nova e antiga)
export type NewReminderFormPayload = {
  titulo: string;
  descricao?: string;
  data_lembrete: string; // YYYY-MM-DD
  hora_lembrete?: string; // HH:mm (ignorado no backend atual)
  repetir: 'nenhuma' | 'diario' | 'semanal' | 'mensal' | 'anual';
  ativo?: boolean;
  family_id?: string;
};

export type LegacyReminderPayload = {
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  recurring?: boolean;
  family_id?: string;
};

function mapToDbColumns(data: NewReminderFormPayload | LegacyReminderPayload) {
  // Detectar formato pelo campo chave
  if ('titulo' in data && data.titulo !== undefined) {
    const d = data as NewReminderFormPayload;
    return {
      title: d.titulo,
      description: d.descricao || null,
      date: d.data_lembrete,
      recurring: d.repetir && d.repetir !== 'nenhuma',
      family_id: d.family_id || null,
    } as const;
  }
  const l = data as LegacyReminderPayload;
  return {
    title: l.title,
    description: l.description || null,
    date: l.date,
    recurring: Boolean(l.recurring),
    family_id: l.family_id || null,
  } as const;
}

// Exemplo de modelo: id, user_id, family_id, title, description, date, recurring, created_at
export const getReminders = async (user_id: string) => {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', user_id)
    .order('date', { ascending: true });
  return { data, error };
};

export const createReminder = async (
  data: (NewReminderFormPayload | LegacyReminderPayload) & { user_id: string }
) => {
  const row = mapToDbColumns(data);
  const { data: result, error } = await supabase.from('reminders').insert({
    user_id: data.user_id,
    ...row,
  });
  return { data: result, error };
};

export const updateReminder = async (
  id: string,
  data: Partial<NewReminderFormPayload | LegacyReminderPayload>
) => {
  const mapped = mapToDbColumns({
    // Fallbacks mínimos para satisfazer o mapper
    titulo: data.titulo ?? data.title ?? '',
    descricao: data.descricao ?? data.description ?? '',
    data_lembrete: data.data_lembrete ?? data.date ?? new Date().toISOString().slice(0, 10),
    repetir: data.repetir ?? (data.recurring ? 'diario' : 'nenhuma'),
  } as NewReminderFormPayload);

  const { data: result, error } = await supabase
    .from('reminders')
    .update(mapped)
    .eq('id', id)
    .select();
  return { data: result, error };
};

export const deleteReminder = async (id: string) => {
  const { data, error } = await supabase.from('reminders').delete().eq('id', id);
  return { data, error };
};