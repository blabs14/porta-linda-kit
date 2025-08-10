export type CategoryDomain = {
  id: string;
  nome: string;
  cor?: string | null;
  tipo?: string | null;
  user_id?: string | null;
};

export function mapCategoryRowToDomain(row: Record<string, unknown>): CategoryDomain {
  return {
    id: String(row.id ?? ''),
    nome: String(row.nome ?? ''),
    cor: (typeof row.cor === 'string' ? row.cor : null),
    tipo: (typeof row.tipo === 'string' ? row.tipo : null),
    user_id: (typeof row.user_id === 'string' ? row.user_id : null),
  };
} 