import { OptionLeg } from '../types';

export interface BacktestDataPoint {
  date: string;
  underlyingPrice: number;
  optionPrice: number;
  iv: number;
  delta: number;
}

export interface BacktestConfig {
  startDate: string;
  endDate: string;
  strategy: OptionLeg[];
}

/**
 * BacktestService
 * 
 * This service is designed to be swappable. 
 * Current: Mock Implementation for Development
 * Future: Replace with NSE Database (Supabase/Firebase) or Tradier API
 */
export class BacktestService {
  /**
   * Ingests 10 years of historical data into DuckDB
   */
  static async ingestData(symbol: string = '^NSEI') {
    const response = await fetch('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol })
    });
    return response.json();
  }

  /**
   * Runs the full backtest logic using DuckDB analytical queries
   */
  static async runBacktest(config: BacktestConfig) {
    const response = await fetch('/api/backtest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        symbol: '^NSEI', // Default for now
        fastPeriod: 20, 
        slowPeriod: 50 
      })
    });
    
    const result = await response.json();
    if (!result.success) throw new Error(result.error);
    
    return result;
  }
}
