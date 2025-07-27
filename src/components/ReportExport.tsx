import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Download, FileText, FileSpreadsheet, Calendar } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '../hooks/use-toast';

interface ReportExportProps {
  onExport: (format: string, dateRange: { start: string; end: string }) => Promise<void>;
}

export const ReportExport = ({ onExport }: ReportExportProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!user) return;

    setIsExporting(true);
    try {
      await onExport(format, dateRange);
      toast({
        title: 'Relatório exportado',
        description: `O relatório foi exportado com sucesso em formato ${format.toUpperCase()}`,
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: 'Ocorreu um erro ao exportar o relatório',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const quickDateRanges = [
    { label: 'Este mês', value: 'current-month' },
    { label: 'Mês passado', value: 'last-month' },
    { label: 'Este ano', value: 'current-year' },
    { label: 'Últimos 30 dias', value: 'last-30-days' },
    { label: 'Últimos 90 dias', value: 'last-90-days' },
  ];

  const handleQuickRange = (range: string) => {
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (range) {
      case 'current-month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'last-month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'current-year':
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        break;
      case 'last-30-days':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = today;
        break;
      case 'last-90-days':
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        endDate = today;
        break;
    }

    setDateRange({
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    });
  };

  if (!user) return null;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Exportar
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Exportar Relatório</h3>

          {/* Formato */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="format">Formato</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV
                  </div>
                </SelectItem>
                <SelectItem value="excel">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Período */}
          <div className="space-y-2 mb-4">
            <Label>Período</Label>
            
            {/* Ranges rápidos */}
            <div className="flex flex-wrap gap-1 mb-2">
              {quickDateRanges.map((range) => (
                <Button
                  key={range.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickRange(range.value)}
                  className="text-xs h-6 px-2"
                >
                  {range.label}
                </Button>
              ))}
            </div>

            {/* Datas personalizadas */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="start-date">Data início</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end-date">Data fim</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  A exportar...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isExporting}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Overlay para fechar quando clicar fora */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}; 