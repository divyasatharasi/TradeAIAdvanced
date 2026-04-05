import { OptionLeg, PayoffPoint, Greeks } from '../types';
import { differenceInDays, parse } from 'date-fns';

/**
 * Standard Normal Cumulative Distribution Function (CNDF)
 */
const cndf = (x: number): number => {
  const a1 = 0.319381530;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  const L = Math.abs(x);
  const K = 1.0 / (1.0 + 0.2316419 * L);
  let d = 1.0 - 1.0 / Math.sqrt(2 * Math.PI) * Math.exp(-L * L / 2) * (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
  if (x < 0) d = 1.0 - d;
  return d;
};

/**
 * Standard Normal Probability Density Function (PDF)
 */
const ndf = (x: number): number => {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
};

/**
 * Black-Scholes formula for option pricing
 */
const blackScholes = (S: number, K: number, T: number, r: number, v: number, type: 'CALL' | 'PUT'): number => {
  if (T <= 0) {
    return type === 'CALL' ? Math.max(0, S - K) : Math.max(0, K - S);
  }
  const d1 = (Math.log(S / K) + (r + v * v / 2) * T) / (v * Math.sqrt(T));
  const d2 = d1 - v * Math.sqrt(T);
  if (type === 'CALL') {
    return S * cndf(d1) - K * Math.exp(-r * T) * cndf(d2);
  } else {
    return K * Math.exp(-r * T) * cndf(-d2) - S * cndf(-d1);
  }
};

/**
 * Calculates individual option Greeks
 */
const calculateOptionGreeks = (S: number, K: number, T: number, r: number, v: number, type: 'CALL' | 'PUT'): Greeks => {
  if (T <= 0) return { delta: 0, gamma: 0, theta: 0, vega: 0 };

  const d1 = (Math.log(S / K) + (r + v * v / 2) * T) / (v * Math.sqrt(T));
  const d2 = d1 - v * Math.sqrt(T);

  const delta = type === 'CALL' ? cndf(d1) : cndf(d1) - 1;
  const gamma = ndf(d1) / (S * v * Math.sqrt(T));
  const vega = (S * Math.sqrt(T) * ndf(d1)) / 100; // Vega per 1% change in IV

  let theta = 0;
  if (type === 'CALL') {
    theta = (-S * ndf(d1) * v) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * cndf(d2);
  } else {
    theta = (-S * ndf(d1) * v) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * cndf(-d2);
  }
  theta = theta / 365; // Theta per day

  return { delta, gamma, theta, vega };
};

export const getDaysToExpiry = (expiryStr: string): number => {
  try {
    const today = new Date(2026, 3, 5); // Consistent with mockData
    const expiryDate = parse(expiryStr, 'dd MMM yyyy', new Date());
    return Math.max(0.1, differenceInDays(expiryDate, today));
  } catch (e) {
    return 7;
  }
};

export const calculatePayoff = (legs: OptionLeg[], spotAtExpiry: number): number => {
  return legs.reduce((total, leg) => {
    let payoff = 0;
    if (leg.type === 'CALL') {
      payoff = Math.max(0, spotAtExpiry - leg.strike);
    } else {
      payoff = Math.max(0, leg.strike - spotAtExpiry);
    }

    const multiplier = leg.side === 'BUY' ? 1 : -1;
    const netPayoff = (payoff - leg.premium) * leg.quantity * leg.lotSize * multiplier;
    
    return total + netPayoff;
  }, 0);
};

/**
 * Calculates the current P&L (T+0) for a strategy
 */
export const calculateCurrentPnL = (legs: OptionLeg[], currentSpot: number, daysToExpiry: number = 7): number => {
  const r = 0.07; // Risk-free rate (7%)
  const v = 0.18; // Volatility (18%)
  const T = daysToExpiry / 365;

  return legs.reduce((total, leg) => {
    const optionValue = blackScholes(currentSpot, leg.strike, T, r, v, leg.type);
    const multiplier = leg.side === 'BUY' ? 1 : -1;
    const netPnL = (optionValue - leg.premium) * leg.quantity * leg.lotSize * multiplier;
    return total + netPnL;
  }, 0);
};

export const generatePayoffData = (legs: OptionLeg[], currentSpot: number, rangePercent: number = 0.15): PayoffPoint[] => {
  const data: PayoffPoint[] = [];
  const minPrice = currentSpot * (1 - rangePercent);
  const maxPrice = currentSpot * (1 + rangePercent);
  const step = (maxPrice - minPrice) / 100;

  // Use the first leg's expiry for T+0 calculation
  const daysToExpiry = legs.length > 0 ? getDaysToExpiry(legs[0].expiry) : 7;

  for (let price = minPrice; price <= maxPrice; price += step) {
    data.push({
      price: Math.round(price * 100) / 100,
      profit: calculatePayoff(legs, price),
      currentProfit: calculateCurrentPnL(legs, price, daysToExpiry),
    });
  }
  return data;
};

export const generateGreeksData = (legs: OptionLeg[], currentSpot: number, rangePercent: number = 0.15): any[] => {
  const data: any[] = [];
  const minPrice = currentSpot * (1 - rangePercent);
  const maxPrice = currentSpot * (1 + rangePercent);
  const step = (maxPrice - minPrice) / 100;

  const daysToExpiry = legs.length > 0 ? getDaysToExpiry(legs[0].expiry) : 7;

  for (let price = minPrice; price <= maxPrice; price += step) {
    const greeks = calculateStrategyGreeks(legs, price, daysToExpiry);
    data.push({
      price: Math.round(price * 100) / 100,
      ...greeks
    });
  }
  return data;
};

/**
 * Estimates Probability of Profit (POP)
 */
export const calculatePOP = (legs: OptionLeg[], currentSpot: number, daysToExpiry: number = 7): number => {
  if (legs.length === 0) return 0;
  
  const v = 0.18; // Volatility (18%)
  const T = daysToExpiry / 365;
  const stdDev = currentSpot * v * Math.sqrt(T);

  // Sample the payoff at many points and see where it's profitable
  // Weight each point by its probability (Normal distribution)
  let totalProb = 0;
  let profitableProb = 0;
  
  const samples = 100;
  const range = 4 * stdDev; // 4 standard deviations
  const step = (2 * range) / samples;

  for (let i = 0; i <= samples; i++) {
    const price = currentSpot - range + (i * step);
    const payoff = calculatePayoff(legs, price);
    
    // Normal distribution PDF (simplified)
    const z = (price - currentSpot) / stdDev;
    const prob = Math.exp(-0.5 * z * z);
    
    totalProb += prob;
    if (payoff > 0) {
      profitableProb += prob;
    }
  }

  return Math.round((profitableProb / totalProb) * 100);
};

export const calculateStrategyGreeks = (legs: OptionLeg[], spotPrice: number, daysToExpiry: number = 7): Greeks => {
  const r = 0.07; // Risk-free rate (7%)
  const v = 0.18; // Volatility (18%)
  const T = daysToExpiry / 365;

  return legs.reduce((acc, leg) => {
    const greeks = calculateOptionGreeks(spotPrice, leg.strike, T, r, v, leg.type);
    const multiplier = leg.side === 'BUY' ? 1 : -1;
    const totalQuantity = leg.quantity * leg.lotSize;

    return {
      delta: acc.delta + (greeks.delta * totalQuantity * multiplier),
      gamma: acc.gamma + (greeks.gamma * totalQuantity * multiplier),
      theta: acc.theta + (greeks.theta * totalQuantity * multiplier),
      vega: acc.vega + (greeks.vega * totalQuantity * multiplier),
    };
  }, { delta: 0, gamma: 0, theta: 0, vega: 0 });
};

/**
 * Estimates the margin required for the strategy.
 * This is a more realistic model based on standard exchange rules (SPAN + Exposure).
 */
export const estimateMargin = (legs: OptionLeg[], spotPrice: number): number => {
  if (legs.length === 0) return 0;

  let totalMargin = 0;
  const buyLegs = legs.filter(l => l.side === 'BUY');
  const sellLegs = legs.filter(l => l.side === 'SELL');

  // 1. Buying options: Margin is just the premium paid
  buyLegs.forEach(leg => {
    totalMargin += leg.premium * leg.quantity * leg.lotSize;
  });

  // 2. Selling options: Requires significant margin
  // Base margin for naked selling is roughly 12-15% of contract value (SPAN)
  // Plus exposure margin (roughly 2-3%)
  const SPAN_PERCENT = 0.12; 
  const EXPOSURE_PERCENT = 0.03;
  
  sellLegs.forEach(sellLeg => {
    const contractValue = spotPrice * sellLeg.lotSize * sellLeg.quantity;
    let spanMargin = contractValue * SPAN_PERCENT;
    let exposureMargin = contractValue * EXPOSURE_PERCENT;

    // Hedge Benefit: Check if this sell leg is hedged by a buy leg of the same type
    // A spread significantly reduces SPAN margin
    const hedge = buyLegs.find(buyLeg => buyLeg.type === sellLeg.type);
    
    if (hedge) {
      const spreadWidth = Math.abs(sellLeg.strike - hedge.strike);
      const spreadMargin = (spreadWidth * sellLeg.lotSize * sellLeg.quantity) + (15000 * sellLeg.quantity);
      spanMargin = Math.min(spanMargin, spreadMargin);
      // Exposure margin is also reduced for spreads
      exposureMargin = exposureMargin * 0.5;
    }

    totalMargin += (spanMargin + exposureMargin);
  });

  return Math.round(totalMargin);
};
