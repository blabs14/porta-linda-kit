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
import { useTranslation } from 'react-i18next';

interface ReportExportOptions {
  includeHours?: boolean;
  includeMileage?: boolean;
  includeConfig?: boolean;
}

interface ReportExportProps {
  onExport: (
    format: string,
    dateRange: { start: string; end: string },
    options?: ReportExportOptions
  ) => Promise<void>;
  extraControls?: (args: {
    includeHours: boolean;
    includeMileage: boolean;
    includeConfig: boolean;
    setIncludeHours: (value: boolean) => void;
    setIncludeMileage: (value: boolean) => void;
    setIncludeConfig: (value: boolean) => void;
  }) => React.ReactNode;
}

export const ReportExport = ({ onExport, extraControls }: ReportExportProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  // Estados para opções adicionais de exportação (defaults: horas=on, km=on, config=off)
  const [includeHours, setIncludeHours] = useState<boolean>(true);
  const [includeMileage, setIncludeMileage] = useState<boolean>(true);
  const [includeConfig, setIncludeConfig] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleQuickRange = (range: string) => {
    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    let start = dateRange.start;
    let end = dateRange.end;

    switch (range) {
      case 'current-month':
        start = startOfCurrentMonth.toISOString().split('T')[0];
        end = endOfCurrentMonth.toISOString().split('T')[0];
        break;
      case 'last-month':
        start = startOfLastMonth.toISOString().split('T')[0];
        end = endOfLastMonth.toISOString().split('T')[0];
        break;
      case 'current-year':
        start = startOfYear.toISOString().split('T')[0];
        end = endOfYear.toISOString().split('T')[0];
        break;
      case 'last-30-days': {
        const d = new Date();
        const startDate = new Date(d);
        startDate.setDate(d.getDate() - 30);
        start = startDate.toISOString().split('T')[0];
        end = d.toISOString().split('T')[0];
        break;
      }
      case 'last-90-days': {
        const d = new Date();
        const startDate = new Date(d);
        startDate.setDate(d.getDate() - 90);
        start = startDate.toISOString().split('T')[0];
        end = d.toISOString().split('T')[0];
        break;
      }
      default:
        break;
    }

    setDateRange({ start, end });
  };

  const handleExport = async () => {
    if (!user) return;

    setIsExporting(true);
    try {
      await onExport(format, dateRange, {
        includeHours,
        includeMileage,
        includeConfig,
      });
      toast({
        title: t('reports.exported'),
        description: t('reports.exportSuccess', { format: format.toUpperCase() }),
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        title: t('reports.exportError'),
        description: t('reports.exportErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };



  if (!user) return null;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Download className="h-4 w-4" />
        {t('reports.export')}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4" role="dialog" aria-label="Exportar Relatório">
          <h3 className="font-semibold text-gray-900 mb-4">{t('reports.exportReport')}</h3>

          {/* Formato */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="format">{t('reports.format')}</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger aria-label={t('reports.selectFormat')}>
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

          {/* Intervalo de datas */}
          <div className="space-y-2 mb-4">
            <Label>{t('reports.dateRange')}</Label>
            <div className="flex flex-wrap gap-2" aria-label={t('reports.quickRanges')}>
              {[
                { label: t('reports.thisMonth'), value: 'current-month' },
                { label: t('reports.lastMonth'), value: 'last-month' },
                { label: t('reports.thisYear'), value: 'current-year' },
                { label: t('reports.last30Days'), value: 'last-30-days' },
                { label: t('reports.last90Days'), value: 'last-90-days' },
              ].map((range) => (
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
                <Label htmlFor="start-date">{t('reports.startDate')}</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end-date">{t('reports.endDate')}</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Controles extra injetados pelo consumidor */}
          {typeof extraControls === 'function' && (
            <div className="space-y-2 mb-4" aria-label={t('reports.additionalOptions')}>
              {extraControls({
                includeHours,
                includeMileage,
                includeConfig,
                setIncludeHours,
                setIncludeMileage,
                setIncludeConfig,
              })}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2">
            <Button onClick={handleExport} disabled={isExporting} className="flex-1" aria-busy={isExporting}>
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('reports.exporting')}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {t('reports.export')}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isExporting}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Overlay para fechar quando clicar fora */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
    </div>
  );
};