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
import { OptionChainItem } from '@/src/types';

interface OptionChainProps {
  data: OptionChainItem[];
  spotPrice: number;
  onAddLeg: (type: 'CALL' | 'PUT', side: 'BUY' | 'SELL', strike: number, premium: number) => void;
}

export const OptionChain: React.FC<OptionChainProps> = ({ data, spotPrice, onAddLeg }) => {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead colSpan={8} className="text-center border-r">CALLS</TableHead>
            <TableHead className="text-center">STRIKE</TableHead>
            <TableHead colSpan={8} className="text-center border-l">PUTS</TableHead>
          </TableRow>
          <TableRow>
            <TableHead className="text-center text-[10px] uppercase">IV</TableHead>
            <TableHead className="text-center text-[10px] uppercase">Vega</TableHead>
            <TableHead className="text-center text-[10px] uppercase">Theta</TableHead>
            <TableHead className="text-center text-[10px] uppercase">Gamma</TableHead>
            <TableHead className="text-center text-[10px] uppercase">Delta</TableHead>
            <TableHead className="text-center text-[10px] uppercase">LTP</TableHead>
            <TableHead className="text-center text-[10px] uppercase">Buy</TableHead>
            <TableHead className="text-center text-[10px] uppercase border-r">Sell</TableHead>
            <TableHead className="text-center bg-muted/30 font-bold">Price</TableHead>
            <TableHead className="text-center border-l text-[10px] uppercase">Buy</TableHead>
            <TableHead className="text-center text-[10px] uppercase">Sell</TableHead>
            <TableHead className="text-center text-[10px] uppercase">LTP</TableHead>
            <TableHead className="text-center text-[10px] uppercase">Delta</TableHead>
            <TableHead className="text-center text-[10px] uppercase">Gamma</TableHead>
            <TableHead className="text-center text-[10px] uppercase">Theta</TableHead>
            <TableHead className="text-center text-[10px] uppercase">Vega</TableHead>
            <TableHead className="text-center text-[10px] uppercase">IV</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => {
            const isCallITM = item.strike < spotPrice;
            const isPutITM = item.strike > spotPrice;
            const callBg = isCallITM ? 'bg-yellow-50/50' : 'bg-white';
            const putBg = isPutITM ? 'bg-yellow-50/50' : 'bg-white';

            return (
              <TableRow key={item.strike} className="hover:bg-muted/20">
                {/* CALLS */}
                <TableCell className={`text-center font-mono text-[11px] text-muted-foreground ${callBg}`}>
                  {item.call.iv.toFixed(1)}%
                </TableCell>
                <TableCell className={`text-center font-mono text-[11px] text-slate-500 ${callBg}`}>
                  {item.call.vega.toFixed(1)}
                </TableCell>
                <TableCell className={`text-center font-mono text-[11px] text-red-500 ${callBg}`}>
                  {item.call.theta.toFixed(1)}
                </TableCell>
                <TableCell className={`text-center font-mono text-[11px] text-slate-500 ${callBg}`}>
                  {item.call.gamma.toFixed(3)}
                </TableCell>
                <TableCell className={`text-center font-mono text-[11px] text-blue-600 ${callBg}`}>
                  {item.call.delta.toFixed(2)}
                </TableCell>
                <TableCell className={`text-center font-mono text-sm font-medium ${callBg}`}>
                  {item.call.premium.toFixed(2)}
                </TableCell>
                <TableCell className={`text-center p-1 ${callBg}`}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-10 text-[10px] text-green-600 hover:bg-green-50"
                    onClick={() => onAddLeg('CALL', 'BUY', item.strike, item.call.premium)}
                  >
                    B
                  </Button>
                </TableCell>
                <TableCell className={`text-center p-1 border-r ${callBg}`}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-10 text-[10px] text-red-600 hover:bg-red-50"
                    onClick={() => onAddLeg('CALL', 'SELL', item.strike, item.call.premium)}
                  >
                    S
                  </Button>
                </TableCell>

                {/* STRIKE */}
                <TableCell className="text-center font-bold bg-muted/10">
                  {item.strike}
                </TableCell>

                {/* PUTS */}
                <TableCell className={`text-center p-1 border-l ${putBg}`}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-10 text-[10px] text-green-600 hover:bg-green-50"
                    onClick={() => onAddLeg('PUT', 'BUY', item.strike, item.put.premium)}
                  >
                    B
                  </Button>
                </TableCell>
                <TableCell className={`text-center p-1 ${putBg}`}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-10 text-[10px] text-red-600 hover:bg-red-50"
                    onClick={() => onAddLeg('PUT', 'SELL', item.strike, item.put.premium)}
                  >
                    S
                  </Button>
                </TableCell>
                <TableCell className={`text-center font-mono text-sm font-medium ${putBg}`}>
                  {item.put.premium.toFixed(2)}
                </TableCell>
                <TableCell className={`text-center font-mono text-[11px] text-blue-600 ${putBg}`}>
                  {item.put.delta.toFixed(2)}
                </TableCell>
                <TableCell className={`text-center font-mono text-[11px] text-slate-500 ${putBg}`}>
                  {item.put.gamma.toFixed(3)}
                </TableCell>
                <TableCell className={`text-center font-mono text-[11px] text-red-500 ${putBg}`}>
                  {item.put.theta.toFixed(1)}
                </TableCell>
                <TableCell className={`text-center font-mono text-[11px] text-slate-500 ${putBg}`}>
                  {item.put.vega.toFixed(1)}
                </TableCell>
                <TableCell className={`text-center font-mono text-[11px] text-muted-foreground ${putBg}`}>
                  {item.put.iv.toFixed(1)}%
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
