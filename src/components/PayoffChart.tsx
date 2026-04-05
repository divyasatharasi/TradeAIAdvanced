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
  Area,
  AreaChart,
  ComposedChart,
} from 'recharts';
import { PayoffPoint } from '@/src/types';

interface PayoffChartProps {
  data: PayoffPoint[];
  currentSpot: number;
}

export const PayoffChart: React.FC<PayoffChartProps> = ({ data, currentSpot }) => {
  return (
    <div className="w-full h-[400px] bg-card p-4 rounded-xl border shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
          <XAxis 
            dataKey="price" 
            type="number" 
            domain={['dataMin', 'dataMax']} 
            tick={{ fontSize: 12 }}
            stroke="#64748b"
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#64748b"
            tickFormatter={(value) => `₹${value.toLocaleString()}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Profit/Loss']}
            labelFormatter={(label) => `Price: ₹${label}`}
          />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} />
          <ReferenceLine x={currentSpot} stroke="#3b82f6" strokeDasharray="5 5" label={{ value: 'Current', position: 'top', fill: '#3b82f6', fontSize: 12 }} />
          
          <Line 
            type="monotone" 
            dataKey="profit" 
            stroke="#3b82f6" 
            strokeWidth={3} 
            dot={false}
            name="At Expiry"
            activeDot={{ r: 6, fill: '#3b82f6' }}
          />
          
          <Line 
            type="monotone" 
            dataKey="currentProfit" 
            stroke="#94a3b8" 
            strokeWidth={2} 
            strokeDasharray="3 3"
            dot={false}
            name="T+0 (Today)"
            activeDot={{ r: 4, fill: '#94a3b8' }}
          />
          
          {/* We can use Area for shading profit/loss regions if we want, but simple line is often clearer for payoff */}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
