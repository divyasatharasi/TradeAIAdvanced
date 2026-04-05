import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GreeksChartProps {
  data: any[];
  currentSpot: number;
}

export const GreeksChart: React.FC<GreeksChartProps> = ({ data, currentSpot }) => {
  const [activeGreek, setActiveGreek] = React.useState<'delta' | 'gamma' | 'theta' | 'vega'>('delta');

  const greekColors = {
    delta: '#3b82f6',
    gamma: '#8b5cf6',
    theta: '#ef4444',
    vega: '#10b981'
  };

  const greekLabels = {
    delta: 'Delta',
    gamma: 'Gamma',
    theta: 'Theta',
    vega: 'Vega'
  };

  return (
    <Card className="shadow-md border-slate-200">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Greeks vs Price</CardTitle>
        <Tabs value={activeGreek} onValueChange={(v) => setActiveGreek(v as any)} className="w-auto">
          <TabsList className="h-8">
            <TabsTrigger value="delta" className="text-[10px] px-2 h-6">Delta</TabsTrigger>
            <TabsTrigger value="gamma" className="text-[10px] px-2 h-6">Gamma</TabsTrigger>
            <TabsTrigger value="theta" className="text-[10px] px-2 h-6">Theta</TabsTrigger>
            <TabsTrigger value="vega" className="text-[10px] px-2 h-6">Vega</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="price" 
                type="number" 
                domain={['auto', 'auto']} 
                fontSize={10}
                tickFormatter={(val) => val.toLocaleString()}
              />
              <YAxis fontSize={10} />
              <Tooltip 
                contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelFormatter={(val) => `Spot: ${val}`}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              <ReferenceLine x={currentSpot} stroke="#64748b" strokeDasharray="3 3" label={{ position: 'top', value: 'Current', fontSize: 10, fill: '#64748b' }} />
              <ReferenceLine y={0} stroke="#cbd5e1" />
              <Line 
                type="monotone" 
                dataKey={activeGreek} 
                name={greekLabels[activeGreek]}
                stroke={greekColors[activeGreek]} 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
