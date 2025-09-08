import React from 'react';
import { Button } from '@/components/ui/button';
import MappingForm from '@/features/importer/MappingForm';
import StagingTable from '@/features/importer/StagingTable';
import { useAuth } from '@/contexts/AuthContext';
import { FamilyContext } from '@/features/family/FamilyContext';
import { createIngestionJob, listStaging, updateNormalized, edgeIngestCSV, edgePostStaging, uploadToBucket, insertIngestionFile } from '@/services/importer';
import { useToast } from '@/hooks/use-toast';

// Tipos para o importador
interface IngestionJob {
  id: string;
  scope: 'family' | 'personal';
  user_id: string;
  family_id: string | null;
  source: 'csv' | 'receipt';
  created_at: string;
}

interface ColumnMapping {
  [key: string]: string;
}

interface StagingRow {
  id: string;
  job_id: string;
  normalized_json: Record<string, unknown>;
  is_duplicate: boolean;
  is_posted: boolean;
}

interface ImportSummary {
  total: number;
  unique: number;
  duplicate: number;
  posted: number;
}

interface PostStagingResponse {
  posted?: number;
  errors?: Array<{ error: string }>;
}

export default function ImporterPage(){
  const { user } = useAuth();
  const famCtx = React.useContext(FamilyContext);
  const scope = famCtx?.family ? 'family' : 'personal';
  const familyId = famCtx?.family?.id || null;
  const [step, setStep] = React.useState<'upload'|'mapping'|'review'>('upload');
  const [job, setJob] = React.useState<IngestionJob | null>(null);
  const [mapping, setMapping] = React.useState<ColumnMapping>({});
  const [rows, setRows] = React.useState<StagingRow[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [uploadType, setUploadType] = React.useState<'csv'|'receipt'>('csv');
  const [file, setFile] = React.useState<File|null>(null);
  const [summary, setSummary] = React.useState<ImportSummary | null>(null);
  const [posting, setPosting] = React.useState(false);
  const { toast } = useToast();

  const startJob = async () => {
    if (!user) return;
    const { data } = await createIngestionJob({ scope: scope as 'family' | 'personal', user_id: user.id, family_id: familyId, source: 'csv' });
    setJob(data);
  };

  const loadSummary = async (jobId: string) => {
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/v_ingestion_job_summary?job_id=eq.${jobId}&select=*`, { headers: { 'Authorization': `Bearer ${key}`, 'apikey': key }});
    const arr = await res.json();
    setSummary(arr?.[0] || { total: 0, unique: 0, duplicate: 0, posted: 0 } as ImportSummary);
  };

  const ingestNow = async () => {
    if (uploadType==='csv') await edgeIngestCSV(job.id, mapping);
    const { data } = await listStaging(job.id);
    setRows(data||[]);
    await loadSummary(job.id);
    setStep('review');
  };

  const onEdit = async (id: string, patch: Record<string, unknown>) => {
    setRows(prev=> prev.map(r=> r.id===id? { ...r, normalized_json: patch } : r));
    await updateNormalized(id, patch);
  };

  const onSelectAll = (checked:boolean) => {
    setSelected(checked ? new Set(rows.map(r=>r.id)) : new Set());
  };
  const onSelect = (id:string, checked:boolean) => {
    const s = new Set(selected);
    if (checked) s.add(id); else s.delete(id);
    setSelected(s);
  };

  const postSelected = async () => {
    if (!job || selected.size===0) return;
    try {
      setPosting(true);
      const res = await edgePostStaging(job.id, Array.from(selected));
      const posted = Number(res?.posted||0);
      const errors = Array.isArray(res?.errors) ? res.errors : [];
      if (posted>0 && errors.length===0) {
        toast({ title: 'Transações adicionadas', description: `${posted} transação(ões) adicionada(s) com sucesso.` });
      } else if (posted>0 && errors.length>0) {
        toast({ title: 'Parcialmente concluído', description: `${posted} adicionadas, ${errors.length} com erro.`, variant: 'default' });
      } else {
        toast({ title: 'Nenhuma transação adicionada', description: errors[0]?.error ? String(errors[0].error) : 'Verifique os campos obrigatórios (conta e categoria).', variant: 'destructive' });
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast({ title: 'Erro ao adicionar', description: errorMessage, variant: 'destructive' });
    } finally {
      // Refresh lista/summary e limpar seleção
      const { data } = await listStaging(job.id);
      setRows(data||[]);
      await loadSummary(job.id);
      setSelected(new Set());
      setPosting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Importar Transações ({scope==='family'?'Familiar':'Pessoal'})</h1>
      {step==='upload' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button className={`px-3 py-1 rounded ${uploadType==='csv'?'bg-primary text-primary-foreground':'bg-muted'}`} onClick={()=>setUploadType('csv')}>Extrato (CSV/Excel)</button>
            <button className={`px-3 py-1 rounded ${uploadType==='receipt'?'bg-primary text-primary-foreground':'bg-muted'}`} onClick={()=>setUploadType('receipt')}>Recibo (Imagem/PDF)</button>
          </div>
          <div className="space-y-2">
            <input type="file" onChange={(e)=>setFile(e.target.files?.[0]||null)} />
            <Button onClick={async()=>{
              if (!user || !file) return;
              const j = job ?? (await createIngestionJob({ scope: scope as 'family' | 'personal', user_id: user.id, family_id: familyId, source: uploadType==='csv'?'csv':'receipt' })).data;
              setJob(j);
              const bucket = uploadType==='csv' ? 'imports' : 'receipts';
              const path = `${user.id}/${Date.now()}_${file.name}`;
              await uploadToBucket(bucket as 'imports' | 'receipts', path, file);
              await insertIngestionFile(j.id, bucket, path, file);
              setStep(uploadType==='csv'?'mapping':'review');
              if (uploadType==='receipt') await ingestNow();
            }}>Upload</Button>
          </div>
        </div>
      )}
      {step==='mapping' && (
        <div className="space-y-2">
          <MappingForm headers={["Data","Descrição","Montante"]} value={mapping} onChange={setMapping} onConfirm={()=>ingestNow()} />
        </div>
      )}
      {step==='review' && (
        <div className="space-y-2">
          {summary && (
            <div className="text-sm text-muted-foreground">Total: {summary.total} · Únicos: {summary.unique} · Duplicados: {summary.duplicate} · Postados: {summary.posted}</div>
          )}
          <StagingTable rows={rows} onEdit={(id, patch)=>onEdit(id, patch)} onSelectAll={onSelectAll} onSelect={onSelect} selectedIds={selected} onRefreshDedupe={async ()=>{
            const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/refresh_staging_dedupe`, { method: 'POST', headers: { 'Authorization': `Bearer ${key}`, 'apikey': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_job_id: job.id })});
            const { data } = await listStaging(job.id);
            setRows(data||[]);
            await loadSummary(job.id);
          }} />
          <Button disabled={selected.size===0 || posting} onClick={async ()=>{ await postSelected(); }}>Adicionar {selected.size} transações</Button>
        </div>
      )}
    </div>
  );
}