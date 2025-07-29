import { useState } from 'react';
import { Button } from './ui/button';
import { Download, FileText, FileSpreadsheet, Settings, BarChart3, Compress, Clock } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useExportReport, useReportTemplates, useScheduledExports, useExportCache } from '../hooks/useExportReport';

export const ReportExport = () => {
  const { exportReportData, batchExportReports, isExporting } = useExportReport();
  const { getTemplates, createTemplate } = useReportTemplates();
  const { createScheduled, getScheduled } = useScheduledExports();
  const { clearExpired, clearAll } = useExportCache();
  
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  
  // Novas opções
  const [includeCharts, setIncludeCharts] = useState(false);
  const [compress, setCompress] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [scheduledExports, setScheduledExports] = useState<any[]>([]);

  const handleExport = async () => {
    try {
      const result = await exportReportData({
        format: format as 'pdf' | 'csv' | 'excel',
        dateRange,
        includeCharts,
        compress,
        template: selectedTemplate ? { id: selectedTemplate, name: '', userId: '', layout: {}, styling: {} } : undefined,
      });
      
      if (result.data) {
        // Download do ficheiro
        const { blob, filename } = result.data;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao exportar:', error);
    }
  };

  const handleBatchExport = async () => {
    try {
      const result = await batchExportReports({
        reports: [
          { type: 'monthly', format: 'pdf' as const },
          { type: 'quarterly', format: 'excel' as const },
          { type: 'yearly', format: 'csv' as const }
        ],
        compress: true
      });
      
      if (result.data) {
        // Download de todos os ficheiros
        result.data.blobs.forEach((blob, index) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = result.data!.filenames[index];
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        });
      }
    } catch (error) {
      console.error('Erro na exportação em lote:', error);
    }
  };

  const loadTemplates = async () => {
    const result = await getTemplates();
    if (result.data) {
      setTemplates(result.data);
    }
  };

  const loadScheduledExports = async () => {
    const result = await getScheduled();
    if (result.data) {
      setScheduledExports(result.data);
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

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            loadTemplates();
            loadScheduledExports();
          }
        }}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Exportar
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <Tabs defaultValue="export" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="export">Exportar</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="scheduled">Agendados</TabsTrigger>
            </TabsList>

            <TabsContent value="export" className="space-y-4">
              <h3 className="font-semibold text-gray-900">Exportar Relatório</h3>

              {/* Formato */}
              <div className="space-y-2">
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
                    <SelectItem value="excel">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                      </div>
                    </SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Opções avançadas */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeCharts" 
                    checked={includeCharts} 
                    onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                  />
                  <Label htmlFor="includeCharts" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Incluir gráficos
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="compress" 
                    checked={compress} 
                    onCheckedChange={(checked) => setCompress(checked as boolean)}
                  />
                  <Label htmlFor="compress" className="flex items-center gap-2">
                    <Compress className="h-4 w-4" />
                    Comprimir ficheiro
                  </Label>
                </div>
              </div>

              {/* Template */}
              <div className="space-y-2">
                <Label htmlFor="template">Template (opcional)</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem template</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Intervalo de datas */}
              <div className="space-y-2">
                <Label>Intervalo de datas</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  />
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
                
                {/* Ranges rápidos */}
                <div className="flex flex-wrap gap-1">
                  {quickDateRanges.map((range) => (
                    <Button
                      key={range.value}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickRange(range.value)}
                      className="text-xs"
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleExport} 
                  disabled={isExporting}
                  className="flex-1"
                >
                  {isExporting ? 'A exportar...' : 'Exportar'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleBatchExport}
                  disabled={isExporting}
                >
                  Lote
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Templates</h3>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Novo
                </Button>
              </div>
              
              <div className="space-y-2">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-gray-500">
                        Criado em {new Date(template.created_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="scheduled" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Exportações Agendadas</h3>
                <Button size="sm" variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  Novo
                </Button>
              </div>
              
              <div className="space-y-2">
                {scheduledExports.map((scheduled) => (
                  <Card key={scheduled.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{scheduled.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-gray-500">
                        {scheduled.schedule} às {scheduled.time}
                      </p>
                      <p className="text-xs text-gray-500">
                        Email: {scheduled.email}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Gestão de cache */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearExpired}
                className="flex-1"
              >
                Limpar Cache Expirado
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearAll}
                className="flex-1"
              >
                Limpar Todo Cache
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 