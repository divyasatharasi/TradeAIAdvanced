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
import { Trash2, Plus, Minus } from 'lucide-react';

interface StrategyPanelProps {
  legs: OptionLeg[];
  onRemoveLeg: (id: string) => void;
  onUpdateLeg: (id: string, updates: Partial<OptionLeg>) => void;
}

export const StrategyPanel: React.FC<StrategyPanelProps> = ({ legs, onRemoveLeg, onUpdateLeg }) => {
  if (legs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl text-muted-foreground">
        <p>No legs added to strategy yet.</p>
        <p className="text-sm">Select strikes from the option chain to begin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
    </div>
  );
};
