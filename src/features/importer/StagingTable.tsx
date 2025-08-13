import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function StagingTable({ rows, onEdit, onSelectAll, onSelect, selectedIds }:{ rows:any[]; onEdit:(id:string, patch:any)=>void; onSelectAll:(checked:boolean)=>void; onSelect:(id:string, checked:boolean)=>void; selectedIds:Set<string> }){
  return (
    <div className="border rounded">
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
          {rows.map((r)=>{
            const n = r.normalized_json || {};
            return (
              <tr key={r.id} className="border-t">
                <td className="p-2"><input type="checkbox" checked={selectedIds.has(r.id)} onChange={(e)=>onSelect(r.id, e.target.checked)} /></td>
                <td className="p-2">{n.date}</td>
                <td className="p-2"><Input value={n.description||''} onChange={(e)=>onEdit(r.id, { ...n, description: e.target.value })} /></td>
                <td className="p-2"><Input value={n.merchant||''} onChange={(e)=>onEdit(r.id, { ...n, merchant: e.target.value })} /></td>
                <td className="p-2">{(n.amount_cents||0)/100} {n.currency||'EUR'}</td>
                <td className="p-2"><Input value={n.category_id||''} onChange={(e)=>onEdit(r.id, { ...n, category_id: e.target.value })} /></td>
                <td className="p-2"><Input value={n.account_id||''} onChange={(e)=>onEdit(r.id, { ...n, account_id: e.target.value })} /></td>
                <td className="p-2">{r.dedupe_status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
} 