import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart as PieChartIcon, BarChart3 } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
}

interface DashboardChartProps {
  data: ChartData[];
  title: string;
  type?: 'pie' | 'bar';
  showLegend?: boolean;
  height?: number;
}

const DashboardChart = ({ 
  data, 
  title, 
  type = 'pie', 
  showLegend = true, 
  height = 300 
}: DashboardChartProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {type === 'pie' ? <PieChartIcon className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <div className="h-12 w-12 mx-auto mb-4 opacity-50 flex items-center justify-center">
              {type === 'pie' ? <PieChartIcon className="h-8 w-8" /> : <BarChart3 className="h-8 w-8" />}
            </div>
            <p>Sem dados para exibir</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percentage }) => `${name}: ${percentage?.toFixed(1) || '0'}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, 'Valor']} />
        {showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={(value: number) => [`€${value.toFixed(2)}`, 'Valor']} />
        <Bar dataKey="value" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {type === 'pie' ? <PieChartIcon className="h-5 w-5" /> : <BarChart3 className="h-5 w-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {type === 'pie' ? renderPieChart() : renderBarChart()}
      </CardContent>
    </Card>
  );
};

export default DashboardChart;