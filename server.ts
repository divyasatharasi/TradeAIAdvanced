import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import duckdb from 'duckdb';
import YahooFinance from 'yahoo-finance2';
import cors from 'cors';

const yahooFinance = new (YahooFinance as any)();
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize DuckDB (Persistent storage)
const db = new duckdb.Database('market_data.db');
const conn = db.connect();

// Helper to run SQL queries as Promises
const runQuery = (sql: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    conn.all(sql, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
};

// 1. Ingest Data Endpoint
app.post('/api/ingest', async (req, res) => {
  const { symbol = '^NSEI' } = req.body;
  
  try {
    console.log(`Ingesting data for ${symbol}...`);
    
    // Fetch 10 years of historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(endDate.getFullYear() - 10);

    const queryOptions = {
      period1: startDate,
      period2: endDate,
      interval: '1d' as any,
    };

    const history = await yahooFinance.historical(symbol, queryOptions) as any[];
    
    if (!history || history.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }

    // Create table if not exists
    await runQuery(`
      CREATE TABLE IF NOT EXISTS historical_data (
        symbol VARCHAR,
        date DATE,
        open DOUBLE,
        high DOUBLE,
        low DOUBLE,
        close DOUBLE,
        volume BIGINT
      )
    `);

    // Clear existing data for this symbol
    await runQuery(`DELETE FROM historical_data WHERE symbol = '${symbol}'`);

    // Insert data using DuckDB's fast ingestion (prepared statement)
    const stmt = conn.prepare('INSERT INTO historical_data VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const row of history) {
      stmt.run(
        symbol,
        row.date.toISOString().split('T')[0],
        row.open,
        row.high,
        row.low,
        row.close,
        row.volume
      );
    }
    stmt.finalize();

    res.json({ 
      success: true, 
      message: `Ingested ${history.length} records for ${symbol}`,
      count: history.length 
    });
  } catch (error) {
    console.error('Ingestion error:', error);
    res.status(500).json({ error: 'Failed to ingest data' });
  }
});

// 2. Backtest Engine Endpoint (Analytical Queries)
app.post('/api/backtest', async (req, res) => {
  const { symbol = '^NSEI', fastPeriod = 20, slowPeriod = 50 } = req.body;

  try {
    // Analytical SQL: Moving Average Crossover Strategy
    // We use DuckDB window functions for lightning-fast simulation
    const sql = `
      WITH base_data AS (
        SELECT 
          date, 
          close,
          AVG(close) OVER (ORDER BY date ROWS BETWEEN ${fastPeriod - 1} PRECEDING AND CURRENT ROW) as fast_ma,
          AVG(close) OVER (ORDER BY date ROWS BETWEEN ${slowPeriod - 1} PRECEDING AND CURRENT ROW) as slow_ma
        FROM historical_data
        WHERE symbol = '${symbol}'
      ),
      signals AS (
        SELECT 
          *,
          CASE 
            WHEN fast_ma > slow_ma AND LAG(fast_ma) OVER (ORDER BY date) <= LAG(slow_ma) OVER (ORDER BY date) THEN 'BUY'
            WHEN fast_ma < slow_ma AND LAG(fast_ma) OVER (ORDER BY date) >= LAG(slow_ma) OVER (ORDER BY date) THEN 'SELL'
            ELSE 'HOLD'
          END as signal
        FROM base_data
      ),
      pnl_calc AS (
        SELECT 
          *,
          SUM(CASE 
            WHEN signal = 'BUY' THEN -close 
            WHEN signal = 'SELL' THEN close 
            ELSE 0 
          END) OVER (ORDER BY date) as cumulative_pnl
        FROM signals
      )
      SELECT * FROM pnl_calc ORDER BY date
    `;

    const results = await runQuery(sql);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'No data for backtest. Please ingest data first.' });
    }

    // Process results for frontend
    let currentEquity = 100000;
    const chartData = results.map(row => {
      // Simple equity simulation based on signals
      // In a real app, you'd track active positions
      return {
        date: row.date.toISOString().split('T')[0],
        equity: 100000 + (row.cumulative_pnl || 0),
        pnl: row.cumulative_pnl || 0,
        fast_ma: row.fast_ma,
        slow_ma: row.slow_ma,
        signal: row.signal
      };
    });

    res.json({ success: true, data: chartData });
  } catch (error) {
    console.error('Backtest error:', error);
    res.status(500).json({ error: 'Backtest failed' });
  }
});

// 3. Real-time Option Chain Endpoint
app.get('/api/quote', async (req, res) => {
  const { symbol = '^NSEI' } = req.query;
  try {
    const quote = await yahooFinance.quote(symbol as string);
    res.json({
      success: true,
      symbol,
      price: quote.regularMarketPrice || quote.regularMarketPreviousClose || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch quote', details: error.message });
  }
});

// --- Black-Scholes Greek Calculations ---
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

const ndf = (x: number): number => {
  return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
};

const calculateOptionGreeks = (S: number, K: number, T: number, r: number, v: number, type: 'CALL' | 'PUT') => {
  if (T <= 0) return { delta: 0, gamma: 0, theta: 0, vega: 0 };
  if (v <= 0) v = 0.01; // Avoid division by zero

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

import { optionDb } from './src/lib/db';

// ... existing code ...

// 4. Real-time Option Chain Endpoint
app.get('/api/option-chain', async (req, res) => {
  const { symbol = '^NSEI', expiration } = req.query;

  try {
    console.log(`Fetching option chain for ${symbol}...`);
    
    // Fetch options data
    console.log(`Querying Yahoo Finance for symbol: ${symbol}`);
    let optionsData: any;
    let isFallback = false;

    try {
      optionsData = await yahooFinance.options(symbol as string, {
        lang: 'en-US',
        region: 'IN',
      }, { timeout: 10000 }) as any;

      if (!optionsData || !optionsData.options || optionsData.options.length === 0) {
        throw new Error('No options found in live data');
      }
    } catch (e: any) {
      console.warn(`Primary fetch failed for ${symbol}:`, e.message);
      
      // Fallback 1: Try common Indian indices if primary fails
      if (symbol === '^NSEI' || symbol === '^NSEBANK') {
        const fallbackSymbol = symbol === '^NSEI' ? 'NIFTY50.NS' : 'BANKNIFTY.NS';
        console.log(`Trying fallback symbol ${fallbackSymbol}...`);
        try {
          optionsData = await yahooFinance.options(fallbackSymbol, { lang: 'en-US', region: 'IN' }, { timeout: 10000 });
        } catch (fallbackError) {
          console.error(`Fallback symbol ${fallbackSymbol} also failed.`);
        }
      }

      // Fallback 2: Check DuckDB for latest stored chain
      if (!optionsData || !optionsData.options || optionsData.options.length === 0) {
        console.log(`Checking DuckDB for latest stored chain for ${symbol}...`);
        const storedData = await optionDb.getLatestChain(symbol as string, expiration as string);
        
        if (storedData) {
          console.log(`Found stored data from ${storedData.updatedAt}`);
          isFallback = true;
          // Reconstruct optionsData structure from stored data
          optionsData = {
            quote: { regularMarketPrice: storedData.spotPrice },
            options: [{ 
              expirationDate: new Date(storedData.expiration),
              calls: storedData.chain.calls,
              puts: storedData.chain.puts
            }]
          };
        } else {
          // Fallback 3: Get most recent historical OHLC to at least have a spot price
          console.log(`No stored chain. Fetching last trading day spot price for ${symbol}...`);
          try {
            const chartData = await yahooFinance.chart(symbol as string, { period1: '5d', interval: '1d' });
            if (chartData && chartData.quotes && chartData.quotes.length > 0) {
              // Filter out quotes with null close prices and get the last valid one
              const validQuotes = chartData.quotes.filter((q: any) => q.close !== null && q.close !== undefined);
              if (validQuotes.length > 0) {
                const lastQuote = validQuotes[validQuotes.length - 1];
                return res.status(404).json({ 
                  error: 'No active options found', 
                  symbol,
                  underlyingPrice: lastQuote.close,
                  message: 'Market is closed or data restricted. Live options are unavailable, but the last trading day spot price was ₹' + lastQuote.close?.toLocaleString()
                });
              }
            }
          } catch (chartError: any) {
            console.error('Failed to fetch historical chart data:', chartError.message);
          }
          
          throw new Error('No options data found and no historical data available');
        }
      }
    }

    // If expiration is provided, find that specific chain
    // Otherwise, use the first available expiration
    const targetExpiration = expiration 
      ? optionsData.options.find((o: any) => o.expirationDate.toISOString().startsWith(expiration as string))
      : optionsData.options[0];

    if (!targetExpiration) {
      return res.status(404).json({ error: 'Expiration not found' });
    }

    // Format the data for the frontend
    // We need to group calls and puts by strike
    const strikesMap = new Map<number, any>();
    const spotPrice = optionsData.quote?.regularMarketPrice || optionsData.quote?.price || 0;
    const now = new Date();
    const T = Math.max(0.001, (targetExpiration.expirationDate.getTime() - now.getTime()) / (365 * 24 * 60 * 60 * 1000));
    const r = 0.07; // Risk-free rate (7%)

    targetExpiration.calls.forEach((call: any) => {
      const greeks = calculateOptionGreeks(spotPrice, call.strike, T, r, call.impliedVolatility || 0.18, 'CALL');
      strikesMap.set(call.strike, {
        strike: call.strike,
        call: {
          premium: call.lastPrice,
          delta: greeks.delta,
          theta: greeks.theta,
          gamma: greeks.gamma,
          vega: greeks.vega,
          iv: (call.impliedVolatility || 0) * 100,
        },
        put: { premium: 0, delta: 0, theta: 0, gamma: 0, vega: 0, iv: 0 }
      });
    });

    targetExpiration.puts.forEach((put: any) => {
      const greeks = calculateOptionGreeks(spotPrice, put.strike, T, r, put.impliedVolatility || 0.18, 'PUT');
      const existing = strikesMap.get(put.strike) || {
        strike: put.strike,
        call: { premium: 0, delta: 0, theta: 0, gamma: 0, vega: 0, iv: 0 },
        put: { premium: 0, delta: 0, theta: 0, gamma: 0, vega: 0, iv: 0 }
      };
      
      existing.put = {
        premium: put.lastPrice,
        delta: greeks.delta,
        theta: greeks.theta,
        gamma: greeks.gamma,
        vega: greeks.vega,
        iv: (put.impliedVolatility || 0) * 100,
      };
      
      strikesMap.set(put.strike, existing);
    });

    const chain = Array.from(strikesMap.values()).sort((a, b) => a.strike - b.strike);
    const expiries = optionsData.options.map((o: any) => o.expirationDate.toISOString().split('T')[0]);

    // Cache the successful live data to DuckDB for future off-market requests
    if (!isFallback) {
      const expirationStr = targetExpiration.expirationDate.toISOString().split('T')[0];
      optionDb.saveChain(symbol as string, expirationStr, spotPrice, targetExpiration, expiries)
        .catch(err => console.error('Failed to cache chain to DuckDB:', err));
    }

    res.json({ 
      success: true, 
      symbol,
      underlyingPrice: spotPrice,
      expiries,
      chain,
      isFallback,
      updatedAt: isFallback ? optionsData.updatedAt : now.toISOString()
    });
  } catch (error: any) {
    console.error('Option chain error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch option chain', 
      details: error.message || String(error),
      symbol 
    });
  }
});

// Vite Middleware for Development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
