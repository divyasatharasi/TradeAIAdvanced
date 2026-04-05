import duckdb from 'duckdb';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'options_data.duckdb');

class OptionDatabase {
  private db: duckdb.Database;

  constructor() {
    this.db = new duckdb.Database(DB_PATH);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS option_chains (
        symbol VARCHAR,
        expiration VARCHAR,
        spot_price DOUBLE,
        chain_json TEXT,
        expiries_json TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (symbol, expiration)
      );
    `);
  }

  public async saveChain(symbol: string, expiration: string, spotPrice: number, chain: any[], expiries: string[]) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO option_chains (symbol, expiration, spot_price, chain_json, expiries_json, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      
      stmt.run(
        symbol, 
        expiration, 
        spotPrice, 
        JSON.stringify(chain), 
        JSON.stringify(expiries),
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  public async getLatestChain(symbol: string, expiration?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let query = `SELECT * FROM option_chains WHERE symbol = ?`;
      const params: any[] = [symbol];

      if (expiration) {
        query += ` AND expiration = ?`;
        params.push(expiration);
      }

      query += ` ORDER BY updated_at DESC LIMIT 1`;

      this.db.all(query, ...params, (err, rows) => {
        if (err) reject(err);
        else if (rows.length === 0) resolve(null);
        else {
          const row = rows[0];
          resolve({
            symbol: row.symbol,
            expiration: row.expiration,
            spotPrice: row.spot_price,
            chain: JSON.parse(row.chain_json),
            expiries: JSON.parse(row.expiries_json),
            updatedAt: row.updated_at
          });
        }
      });
    });
  }
}

export const optionDb = new OptionDatabase();
