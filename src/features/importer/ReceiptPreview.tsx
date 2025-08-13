import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function ReceiptPreview({ ocr, value, onChange }:{ ocr:any; value:any; onChange:(v:any)=>void }){
  const update = (k:string,v:any)=> onChange({ ...value, [k]: v });
  return (
    <Card>
      <CardHeader><CardTitle>Recibo</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Comerciante" value={value.merchant||ocr?.merchant||''} onChange={(e)=>update('merchant', e.target.value)} />
          <Input placeholder="Data" value={value.date||ocr?.date||''} onChange={(e)=>update('date', e.target.value)} />
          <Input placeholder="Total (€)" value={value.total||ocr?.total||''} onChange={(e)=>update('total', e.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
} 