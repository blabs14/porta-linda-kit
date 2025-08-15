import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useCategoriesDomain, useCreateCategory } from '@/hooks/useCategoriesQuery';
import { useAccountsDomain } from '@/hooks/useAccountsQuery';
import { useAuth } from '@/contexts/AuthContext';

export default function StagingTable({ rows, onEdit, onSelectAll, onSelect, selectedIds, onRefreshDedupe }:{ rows:any[]; onEdit:(id:string, patch:any)=>void; onSelectAll:(checked:boolean)=>void; onSelect:(id:string, checked:boolean)=>void; selectedIds:Set<string>; onRefreshDedupe?:()=>void }){
  const [stateFilter, setStateFilter] = React.useState<'all'|'unique'|'duplicate'|'posted'>('all');
  const { data: categories = [] } = useCategoriesDomain();
  const { data: accounts = [] } = useAccountsDomain();
  const { user } = useAuth();
  const createCategory = useCreateCategory();
  const [newCategoryByRow, setNewCategoryByRow] = React.useState<Record<string,string>>({});
  const filtered = React.useMemo(()=>{
    if (stateFilter==='all') return rows;
    if (stateFilter==='posted') return rows.filter(r=> !!r.posted_txn_id);
    if (stateFilter==='unique') return rows.filter(r=> r.dedupe_status==='unique' && !r.posted_txn_id);
    if (stateFilter==='duplicate') return rows.filter(r=> r.dedupe_status==='duplicate');
    return rows;
  }, [rows, stateFilter]);

  const renderStatus = (r:any) => {
    if (r.posted_txn_id) return <Badge variant="secondary">postado</Badge>;
    if (r.dedupe_status==='duplicate') return <Badge variant="destructive">duplicado</Badge>;
    if (r.dedupe_status==='unique') return <Badge variant="default">único</Badge>;
    return <Badge variant="outline">desconhecido</Badge>;
  };

  return (
    <div className="border rounded">
      <div className="flex items-center justify-between p-2 gap-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">Revisão</div>
          <div className="text-xs text-muted-foreground">Filtro:</div>
          <div className="flex gap-1">
            <Button size="xs" variant={stateFilter==='all'?'default':'secondary'} onClick={()=>setStateFilter('all')}>Todos</Button>
            <Button size="xs" variant={stateFilter==='unique'?'default':'secondary'} onClick={()=>setStateFilter('unique')}>Únicos</Button>
            <Button size="xs" variant={stateFilter==='duplicate'?'default':'secondary'} onClick={()=>setStateFilter('duplicate')}>Duplicados</Button>
            <Button size="xs" variant={stateFilter==='posted'?'default':'secondary'} onClick={()=>setStateFilter('posted')}>Postados</Button>
          </div>
        </div>
        {onRefreshDedupe && (
          <Button size="sm" variant="secondary" onClick={onRefreshDedupe}>Atualizar duplicados</Button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted">
            <th className="p-2"><input type="checkbox" aria-label="Selecionar todos" onChange={(e)=>onSelectAll(e.target.checked)} /></th>
            <th className="p-2">Data</th>
            <th className="p-2">Descrição</th>
            <th className="p-2">Comerciante</th>
            <th className="p-2">Montante</th>
            <th className="p-2">Categoria</th>
            <th className="p-2">Conta</th>
            <th className="p-2">Estado</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r)=>{
            const n = r.normalized_json || {};
            const newCat = newCategoryByRow[r.id] || '';
            return (
              <tr key={r.id} className="border-t">
                <td className="p-2"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={(e)=>onSelect(r.id, e.target.checked)} /></td>
                <td className="p-2">{n.date}</td>
                <td className="p-2"><Input type="text" value={n.description||''} onChange={(e)=>onEdit(r.id, { ...n, description: e.target.value })} /></td>
                <td className="p-2"><Input type="text" value={n.merchant||''} onChange={(e)=>onEdit(r.id, { ...n, merchant: e.target.value })} /></td>
                <td className="p-2">{(n.amount_cents||0)/100} {n.currency||'EUR'}</td>
                <td className="p-2">
                  <select className="w-full border rounded px-2 py-2" value={n.category_id||''} onChange={(e)=>onEdit(r.id, { ...n, category_id: e.target.value })}>
                    <option value="">Selecionar…</option>
                    {categories.map((c:any)=> <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  {!n.category_id && (
                    <div className="mt-1 flex gap-1">
                      <Input type="text" placeholder="Nova categoria" value={newCat} onChange={(e)=>setNewCategoryByRow(prev=>({ ...prev, [r.id]: e.target.value }))} />
                      <Button size="xs" onClick={async()=>{
                        if (!newCat.trim()) return;
                        const created = await createCategory.mutateAsync({ nome: newCat.trim(), user_id: user?.id } as any);
                        if (created?.id) {
                          setNewCategoryByRow(prev=>({ ...prev, [r.id]: '' }));
                          onEdit(r.id, { ...n, category_id: created.id });
                        }
                      }}>Criar</Button>
                    </div>
                  )}
                </td>
                <td className="p-2">
                  <select className="w-full border rounded px-2 py-2" value={n.account_id||''} onChange={(e)=>onEdit(r.id, { ...n, account_id: e.target.value })}>
                    <option value="">Selecionar…</option>
                    {accounts.map((a:any)=> <option key={a.id} value={a.id}>{a.nome}</option>)}
                  </select>
                </td>
                <td className="p-2">{renderStatus(r)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
} 