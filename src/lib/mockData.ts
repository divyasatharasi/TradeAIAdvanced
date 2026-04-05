import { OptionChainItem, OptionLeg } from '../types';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isTuesday, isThursday, lastDayOfMonth, subDays, isSameDay } from 'date-fns';

export interface Instrument {
  name: string;
  spot: number;
  step: number;
  lotSize: number;
  type: 'INDEX' | 'STOCK';
}

export const INSTRUMENTS: Instrument[] = [
  { name: 'NIFTY', spot: 22713.10, step: 50, lotSize: 50, type: 'INDEX' },
  { name: 'BANKNIFTY', spot: 48120.50, step: 100, lotSize: 15, type: 'INDEX' },
  { name: 'FINNIFTY', spot: 21340.20, step: 50, lotSize: 40, type: 'INDEX' },
  { name: 'MIDCPNIFTY', spot: 10840.50, step: 25, lotSize: 75, type: 'INDEX' },
  { name: 'RELIANCE', spot: 2940.15, step: 20, lotSize: 250, type: 'STOCK' },
  { name: 'TCS', spot: 3980.40, step: 20, lotSize: 175, type: 'STOCK' },
];

// NSE Holidays 2026 (Partial list for demo months)
const HOLIDAYS_2026 = [
  new Date(2026, 0, 26), // Republic Day
  new Date(2026, 2, 6),  // Holi
  new Date(2026, 2, 27), // Eid-ul-Fitr
  new Date(2026, 3, 2),  // Mahavir Jayanti
  new Date(2026, 3, 3),  // Good Friday
  new Date(2026, 3, 14), // Dr. Ambedkar Jayanti (Tuesday)
  new Date(2026, 4, 1),  // Maharashtra Day
];

const isHoliday = (date: Date) => {
  return HOLIDAYS_2026.some(holiday => isSameDay(holiday, date));
};

const adjustForHoliday = (date: Date): Date => {
  let adjustedDate = date;
  while (isHoliday(adjustedDate)) {
    adjustedDate = subDays(adjustedDate, 1);
  }
  return adjustedDate;
};

export const getExpiriesForInstrument = (instrument: Instrument): string[] => {
  const expiries: string[] = [];
  const today = new Date(2026, 3, 5); // Mocking "today" as April 5, 2026
  const endPeriod = addDays(today, 60);

  if (instrument.type === 'INDEX') {
    // Weekly Tuesdays
    const days = eachDayOfInterval({ start: today, end: endPeriod });
    days.forEach(day => {
      if (isTuesday(day)) {
        const finalDate = adjustForHoliday(day);
        expiries.push(format(finalDate, 'dd MMM yyyy').toUpperCase());
      }
    });
  } else {
    // Monthly Last Thursdays for Stocks
    for (let i = 0; i < 3; i++) {
      const monthDate = addDays(startOfMonth(today), i * 31);
      const lastDay = lastDayOfMonth(monthDate);
      const daysInMonth = eachDayOfInterval({ start: startOfMonth(monthDate), end: lastDay });
      const thursdays = daysInMonth.filter(day => isThursday(day));
      const lastThursday = thursdays[thursdays.length - 1];
      
      if (lastThursday >= today) {
        const finalDate = adjustForHoliday(lastThursday);
        expiries.push(format(finalDate, 'dd MMM yyyy').toUpperCase());
      }
    }
  }

  return Array.from(new Set(expiries)).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
};

export const generateMockOptionChain = (spot: number, step: number = 50, count: number = 20): OptionChainItem[] => {
  const data: OptionChainItem[] = [];
  const startStrike = Math.floor(spot / step) * step - (Math.floor(count / 2) * step);

  for (let i = 0; i < count; i++) {
    const strike = startStrike + (i * step);
    const distance = Math.abs(strike - spot);
    
    // Simple model for premiums
    // Calls: higher price when strike < spot
    // Puts: higher price when strike > spot
    const callPremium = Math.max(5, (spot - strike) + (distance * 0.1) + 50);
    const putPremium = Math.max(5, (strike - spot) + (distance * 0.1) + 50);

    data.push({
      strike,
      call: {
        premium: Math.round(callPremium * 10) / 10,
        delta: strike < spot ? 0.7 : 0.3,
        theta: -15,
        gamma: 0.002,
        vega: 12.5,
        iv: 18.5,
      },
      put: {
        premium: Math.round(putPremium * 10) / 10,
        delta: strike > spot ? -0.7 : -0.3,
        theta: -14,
        gamma: 0.002,
        vega: 12.0,
        iv: 19.2,
      },
    });
  }
  return data;
};

export const STRATEGY_PRESETS = [
  {
    name: 'Bull Call Spread',
    description: 'Buy ATM Call, Sell OTM Call',
    getLegs: (spot: number, step: number, lotSize: number, expiry: string): Partial<OptionLeg>[] => [
      { type: 'CALL', side: 'BUY', strike: Math.round(spot / step) * step, premium: 150, quantity: 1, lotSize, expiry },
      { type: 'CALL', side: 'SELL', strike: Math.round(spot / step) * step + step * 2, premium: 60, quantity: 1, lotSize, expiry },
    ]
  },
  {
    name: 'Bear Put Spread',
    description: 'Buy ATM Put, Sell OTM Put',
    getLegs: (spot: number, step: number, lotSize: number, expiry: string): Partial<OptionLeg>[] => [
      { type: 'PUT', side: 'BUY', strike: Math.round(spot / step) * step, premium: 140, quantity: 1, lotSize, expiry },
      { type: 'PUT', side: 'SELL', strike: Math.round(spot / step) * step - step * 2, premium: 55, quantity: 1, lotSize, expiry },
    ]
  },
  {
    name: 'Iron Condor',
    description: 'Sell OTM Put/Call, Buy further OTM Put/Call',
    getLegs: (spot: number, step: number, lotSize: number, expiry: string): Partial<OptionLeg>[] => {
      const atm = Math.round(spot / step) * step;
      return [
        { type: 'PUT', side: 'BUY', strike: atm - step * 4, premium: 20, quantity: 1, lotSize, expiry },
        { type: 'PUT', side: 'SELL', strike: atm - step * 2, premium: 45, quantity: 1, lotSize, expiry },
        { type: 'CALL', side: 'SELL', strike: atm + step * 2, premium: 40, quantity: 1, lotSize, expiry },
        { type: 'CALL', side: 'BUY', strike: atm + step * 4, premium: 15, quantity: 1, lotSize, expiry },
      ];
    }
  },
  {
    name: 'Straddle',
    description: 'Buy ATM Call and Put',
    getLegs: (spot: number, step: number, lotSize: number, expiry: string): Partial<OptionLeg>[] => {
      const atm = Math.round(spot / step) * step;
      return [
        { type: 'CALL', side: 'BUY', strike: atm, premium: 150, quantity: 1, lotSize, expiry },
        { type: 'PUT', side: 'BUY', strike: atm, premium: 140, quantity: 1, lotSize, expiry },
      ];
    }
  }
];
