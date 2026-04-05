import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink, Clock, TrendingUp } from 'lucide-react';
import { SavedStrategy } from '../types';
import { Badge } from '@/components/ui/badge';

interface PortfolioProps {
  strategies: SavedStrategy[];
  onDelete: (id: string) => void;
  onLoad: (strategy: SavedStrategy) => void;
}

export const Portfolio: React.FC<PortfolioProps> = ({ strategies, onDelete, onLoad }) => {
  if (strategies.length === 0) {
    return (
      <Card className="border-dashed border-2 bg-slate-50/50">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <TrendingUp className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">No saved strategies</h3>
          <p className="text-sm text-slate-500 max-w-[250px] mt-1">
            Build a strategy and save it to track its performance over time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {strategies.map((strategy) => (
        <Card key={strategy.id} className="shadow-sm hover:shadow-md transition-shadow border-slate-200 overflow-hidden group">
          <CardHeader className="pb-2 bg-slate-50/50 border-b">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <CardTitle className="text-sm font-bold truncate max-w-[150px]">
                  {strategy.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] h-4 px-1 bg-white">
                    {strategy.instrument}
                  </Badge>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(strategy.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => onLoad(strategy)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(strategy.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {strategy.legs.map((leg, idx) => (
                  <Badge 
                    key={idx} 
                    variant="secondary" 
                    className={`text-[10px] font-mono ${leg.side === 'BUY' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}
                  >
                    {leg.side === 'BUY' ? '+' : '-'}{leg.quantity} {leg.type} {leg.strike}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">Entry Spot</span>
                <span className="text-xs font-mono font-bold">₹{strategy.spotPrice.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
