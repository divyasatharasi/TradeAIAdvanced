import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import duckdb from 'duckdb';
import yahooFinance from 'yahoo-finance2';
import cors from 'cors';
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
