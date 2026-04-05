import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OptionLeg } from '@/src/types';
import { Trash2, Plus, Minus, BarChart3 } from 'lucide-react';
import { calculateLegPnL } from '../lib/options';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid
} from 'recharts';

interface StrategyPanelProps {
  legs: OptionLeg[];
  spotPrice: number;
  daysToExpiry: number;
  onRemoveLeg: (id: string) => void;
  onUpdateLeg: (id: string, updates: Partial<OptionLeg>) => void;
}

export const StrategyPanel: React.FC<StrategyPanelProps> = ({ 
  legs, 
  spotPrice, 
  daysToExpiry, 
  onRemoveLeg, 
  onUpdateLeg 
}) => {
  if (legs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
        <p>No legs added to strategy yet.</p>
        <p className="text-sm">Select strikes from the option chain to begin.</p>
      </div>
    );
  }

  const chartData = legs.map((leg) => {
    const pnl = calculateLegPnL(leg, spotPrice, daysToExpiry);
    return {
      name: `${leg.type} ${leg.strike}`,
      pnl: Math.round(pnl),
      side: leg.side
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Strategy Legs</h3>
        <Badge variant="outline">{legs.length} Legs</Badge>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Strike</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Premium</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {legs.map((leg) => (
              <TableRow key={leg.id}>
                <TableCell>
                  <Badge variant={leg.type === 'CALL' ? 'default' : 'secondary'} className={leg.type === 'CALL' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'}>
                    {leg.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={leg.side === 'BUY' ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                    {leg.side}
                  </span>
                </TableCell>
                <TableCell className="font-mono">{leg.strike}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => onUpdateLeg(leg.id, { quantity: Math.max(1, leg.quantity - 1) })}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center">{leg.quantity}</span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => onUpdateLeg(leg.id, { quantity: leg.quantity + 1 })}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="font-mono">₹{leg.premium}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => onRemoveLeg(leg.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <BarChart3 className="h-4 w-4" />
          Leg P/L Visualization
        </div>
        <div className="h-[200px] w-full bg-slate-50/50 rounded-lg p-2 border border-slate-100">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                fontSize={10} 
                tick={{ fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                fontSize={10} 
                tick={{ fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `₹${val}`}
              />
              <Tooltip 
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'P/L']}
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
