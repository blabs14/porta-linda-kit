import React from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z.object({
  date: z.string().min(1),
  amount: z.string().min(1),
  description: z.string().min(1),
  debit_sign: z.number().optional(),
  decimal: z.string().optional(),
  date_fmt: z.string().optional()
});

export interface MappingFormProps {
  headers: string[];
  value: any;
  onChange: (v:any)=>void;
  onConfirm: ()=>void;
}

export default function MappingForm({ headers, value, onChange, onConfirm }: MappingFormProps){
  const [local, setLocal] = React.useState<any>(value || {});
  const update = (k:string, v:any)=>{ const n = { ...local, [k]: v }; setLocal(n); onChange(n); };
  return (
    <Card>
      <CardHeader><CardTitle>Mapeamento de Colunas</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <SelectField label="Data" value={local.date} options={headers} onChange={(v)=>update('date',v)} />
          <SelectField label="Montante" value={local.amount} options={headers} onChange={(v)=>update('amount',v)} />
          <SelectField label="Descrição" value={local.description} options={headers} onChange={(v)=>update('description',v)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Formato data (ex.: DD/MM/YYYY)" value={local.date_fmt||''} onChange={(e)=>update('date_fmt', e.target.value)} />
          <Input placeholder="Separador decimal (ex.: , ou .)" value={local.decimal||''} onChange={(e)=>update('decimal', e.target.value)} />
          <Input placeholder="Sinal débito (ex.: -1)" value={local.debit_sign||''} onChange={(e)=>update('debit_sign', Number(e.target.value||0))} />
        </div>
        <Button onClick={onConfirm}>Confirmar</Button>
      </CardContent>
    </Card>
  );
}

function SelectField({ label, value, options, onChange }:{ label:string; value:string; options:string[]; onChange:(v:string)=>void }){
  return (
    <div>
      <div className="text-sm mb-1">{label}</div>
      <select className="w-full border rounded px-2 py-2" value={value||''} onChange={(e)=>onChange(e.target.value)}>
        <option value="">Selecionar…</option>
        {options.map(h=> <option key={h} value={h}>{h}</option>)}
      </select>
    </div>
  );
} 