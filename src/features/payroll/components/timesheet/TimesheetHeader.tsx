import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Download } from 'lucide-react';

interface TimesheetHeaderProps {
  weekDays: Date[];
  weekNumber: number;
  onImportCSV: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCSV: () => void;
}

export function TimesheetHeader({
  weekDays,
  weekNumber,
  onImportCSV,
  onExportCSV,
}: TimesheetHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">Timesheet Semanal</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={onImportCSV}
              className="hidden"
              id="csv-import"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('csv-import')?.click()}
              aria-label="Importar CSV"
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
            <Button variant="outline" onClick={onExportCSV} aria-label="Exportar CSV">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}