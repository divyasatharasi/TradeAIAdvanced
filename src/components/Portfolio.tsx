import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink, Clock, TrendingUp, Filter, Zap } from 'lucide-react';
import { SavedStrategy } from '../types';
import { Badge } from '@/components/ui/badge';
import { INSTRUMENTS } from '../lib/mockData';
import { calculateStrategyGreeks, getDaysToExpiry, calculateStrategySummary } from '../lib/options';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PortfolioProps {
  strategies: SavedStrategy[];
  onDelete: (id: string) => void;
  onLoad: (strategy: SavedStrategy) => void;
}

export const Portfolio: React.FC<PortfolioProps> = ({ strategies, onDelete, onLoad }) => {
  const [filterInstrument, setFilterInstrument] = useState<string>('all');

  const filteredStrategies = filterInstrument === 'all' 
    ? strategies 
    : strategies.filter(s => s.instrument === filterInstrument);

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Filter className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Filter Portfolio</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">By Instrument</p>
          </div>
        </div>
        
        <div className="w-full sm:w-64">
          <Select value={filterInstrument} onValueChange={setFilterInstrument}>
            <SelectTrigger className="w-full bg-slate-50 border-slate-200">
              <SelectValue placeholder="Select Instrument" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Instruments</SelectItem>
              {INSTRUMENTS.map((inst) => (
                <SelectItem key={inst.name} value={inst.name}>
                  {inst.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredStrategies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
          <p className="text-slate-500 font-medium">No strategies found for {filterInstrument}</p>
          <Button 
            variant="link" 
            className="text-blue-600 mt-2"
            onClick={() => setFilterInstrument('all')}
          >
            Clear filter
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStrategies.map((strategy) => {
            const daysToExpiry = getDaysToExpiry(strategy.expiry);
            const greeks = calculateStrategyGreeks(strategy.legs, strategy.spotPrice, daysToExpiry);
            const summary = calculateStrategySummary(strategy.legs, strategy.spotPrice);
            
            return (
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

                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Max Profit</span>
                        <span className={`text-xs font-bold ${summary.maxProfit === Infinity ? 'text-green-600' : 'text-slate-700'}`}>
                          {summary.maxProfit === Infinity ? 'Unlimited' : `₹${Math.round(summary.maxProfit).toLocaleString()}`}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Max Loss</span>
                        <span className={`text-xs font-bold ${summary.maxLoss === -Infinity ? 'text-red-600' : 'text-slate-700'}`}>
                          {summary.maxLoss === -Infinity ? 'Unlimited' : `₹${Math.round(summary.maxLoss).toLocaleString()}`}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Net {summary.netCreditDebit >= 0 ? 'Credit' : 'Debit'}</span>
                        <span className={`text-xs font-bold ${summary.netCreditDebit >= 0 ? 'text-green-600' : 'text-blue-600'}`}>
                          ₹{Math.abs(Math.round(summary.netCreditDebit)).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 py-2 border-b border-slate-100">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Delta</span>
                        <span className={`text-xs font-mono font-bold ${greeks.delta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {greeks.delta.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Gamma</span>
                        <span className="text-xs font-mono font-bold text-slate-700">
                          {greeks.gamma.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Theta</span>
                        <span className="text-xs font-mono font-bold text-red-600">
                          {greeks.theta.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400 uppercase font-bold">Vega</span>
                        <span className="text-xs font-mono font-bold text-blue-600">
                          {greeks.vega.toFixed(1)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500">Entry Spot</span>
                      <span className="text-xs font-mono font-bold">₹{strategy.spotPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
