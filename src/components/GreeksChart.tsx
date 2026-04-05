import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface GreeksChartProps {
  data: any[];
  currentSpot: number;
}

type GreekType = 'delta' | 'gamma' | 'theta' | 'vega' | 'all';

export const GreeksChart: React.FC<GreeksChartProps> = ({ data, currentSpot }) => {
  const [selectedGreek, setSelectedGreek] = useState<GreekType>('all');

  const greekColors = {
    delta: '#3b82f6', // Blue
    gamma: '#8b5cf6', // Purple
    theta: '#ef4444', // Red
    vega: '#10b981'  // Green
  };

  const greeks = [
    { id: 'delta', label: 'Delta', color: greekColors.delta },
    { id: 'gamma', label: 'Gamma', color: greekColors.gamma },
    { id: 'theta', label: 'Theta', color: greekColors.theta },
    { id: 'vega', label: 'Vega', color: greekColors.vega },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <Button 
            variant={selectedGreek === 'all' ? "default" : "ghost"} 
            size="sm" 
            className="h-7 text-[10px] px-2"
            onClick={() => setSelectedGreek('all')}
          >
            All
          </Button>
          {greeks.map((g) => (
            <Button 
              key={g.id}
              variant={selectedGreek === g.id ? "default" : "ghost"} 
              size="sm" 
              className={`h-7 text-[10px] px-2 ${selectedGreek === g.id ? '' : 'text-slate-600'}`}
              onClick={() => setSelectedGreek(g.id as GreekType)}
            >
              {g.label}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-3 text-[10px] font-medium text-slate-500">
          {greeks.map((g) => (
            <div key={g.id} className={`flex items-center gap-1 transition-opacity ${selectedGreek !== 'all' && selectedGreek !== g.id ? 'opacity-30' : 'opacity-100'}`}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }} />
              {g.label}
            </div>
          ))}
        </div>
      </div>

      <div className="h-[350px] w-full bg-white rounded-xl border border-slate-100 p-4 shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="price" 
              type="number" 
              domain={['auto', 'auto']} 
              fontSize={10}
              tickFormatter={(val) => val.toLocaleString()}
              stroke="#94a3b8"
            />
            <YAxis 
              fontSize={10} 
              stroke="#94a3b8"
              tickFormatter={(val) => val.toFixed(selectedGreek === 'gamma' ? 3 : 1)}
            />
            <Tooltip 
              contentStyle={{ fontSize: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              labelFormatter={(val) => `Spot: ₹${val.toLocaleString()}`}
              formatter={(value: number, name: string) => [value.toFixed(3), name]}
            />
            <ReferenceLine x={currentSpot} stroke="#64748b" strokeDasharray="3 3" label={{ position: 'top', value: 'Current', fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
            <ReferenceLine y={0} stroke="#cbd5e1" />
            
            {(selectedGreek === 'all' || selectedGreek === 'delta') && (
              <Line 
                type="monotone" 
                dataKey="delta" 
                name="Delta"
                stroke={greekColors.delta} 
                strokeWidth={2.5} 
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                animationDuration={500}
              />
            )}
            {(selectedGreek === 'all' || selectedGreek === 'gamma') && (
              <Line 
                type="monotone" 
                dataKey="gamma" 
                name="Gamma"
                stroke={greekColors.gamma} 
                strokeWidth={2.5} 
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                animationDuration={500}
              />
            )}
            {(selectedGreek === 'all' || selectedGreek === 'theta') && (
              <Line 
                type="monotone" 
                dataKey="theta" 
                name="Theta"
                stroke={greekColors.theta} 
                strokeWidth={2.5} 
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                animationDuration={500}
              />
            )}
            {(selectedGreek === 'all' || selectedGreek === 'vega') && (
              <Line 
                type="monotone" 
                dataKey="vega" 
                name="Vega"
                stroke={greekColors.vega} 
                strokeWidth={2.5} 
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                animationDuration={500}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <span className="font-bold text-slate-700">Note:</span> Greeks are calculated using the Black-Scholes model. 
          {selectedGreek === 'gamma' && " Gamma is often much smaller than other Greeks; viewing it individually provides better scale resolution."}
          {selectedGreek === 'all' && " When viewing all Greeks, smaller values like Gamma may appear flat due to scale differences."}
        </p>
      </div>
    </div>
  );
};
