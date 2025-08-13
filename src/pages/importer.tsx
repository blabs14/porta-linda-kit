import React from 'react';
import { Button } from '@/components/ui/button';
import MappingForm from '@/features/importer/MappingForm';
import StagingTable from '@/features/importer/StagingTable';
import { useAuth } from '@/contexts/AuthContext';
import { FamilyContext } from '@/features/family/FamilyContext';
import { createIngestionJob, listStaging, updateNormalized, edgeIngestCSV, edgePostStaging, uploadToBucket, insertIngestionFile } from '@/services/importer';

export default function ImporterPage(){
  const { user } = useAuth();
  const famCtx = React.useContext(FamilyContext);
  const scope = famCtx?.family ? 'family' : 'personal';
  const familyId = famCtx?.family?.id || null;
  const [step, setStep] = React.useState<'upload'|'mapping'|'review'>('upload');
  const [job, setJob] = React.useState<any>(null);
  const [mapping, setMapping] = React.useState<any>({});
  const [rows, setRows] = React.useState<any[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [uploadType, setUploadType] = React.useState<'csv'|'receipt'>('csv');
  const [file, setFile] = React.useState<File|null>(null);

  const startJob = async () => {
    if (!user) return;
    const { data } = await createIngestionJob({ scope: scope as any, user_id: user.id, family_id: familyId, source: 'csv' });
    setJob(data);
  };

  const ingestNow = async () => {
    if (uploadType==='csv') await edgeIngestCSV(job.id, mapping);
    const { data } = await listStaging(job.id);
    setRows(data||[]);
    setStep('review');
  };

  const onEdit = async (id:string, patch:any) => {
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
    await edgePostStaging(job.id, Array.from(selected));
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
              if (!job) await startJob();
              const j = job || (await createIngestionJob({ scope: scope as any, user_id: user.id, family_id: familyId, source: uploadType==='csv'?'csv':'receipt' })).data;
              setJob(j);
              const bucket = uploadType==='csv' ? 'imports' : 'receipts';
              const path = `${bucket}/${user.id}/${Date.now()}_${file.name}`;
              await uploadToBucket(bucket as any, path, file);
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
          <StagingTable rows={rows} onEdit={(id,patch)=>onEdit(id,patch)} onSelectAll={onSelectAll} onSelect={onSelect} selectedIds={selected} />
          <Button onClick={postSelected}>Adicionar {selected.size} transações</Button>
        </div>
      )}
    </div>
  );
} 