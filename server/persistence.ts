import { Pool } from 'pg';

type Change = { collection: string; id?: string; value?: unknown; clear?: boolean };

/** PostgreSQL-backed durable storage behind the existing domain maps. */
export class PostgresPersistence {
  private readonly pool: Pool;
  private writes: Promise<void> = Promise.resolve();

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString, max: 10, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : undefined });
  }

  async connect() {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS erp_records (
      collection VARCHAR(64) NOT NULL, id TEXT NOT NULL, data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), PRIMARY KEY (collection, id)
    )`);
  }

  async load(): Promise<Array<{ collection: string; id: string; data: unknown }>> {
    return (await this.pool.query('SELECT collection, id, data FROM erp_records')).rows;
  }

  queue(change: Change) {
    this.writes = this.writes.catch((error) => {
      console.error('Recovering PostgreSQL write queue after a failed write:', error);
    }).then(async () => {
      if (change.clear) await this.pool.query('DELETE FROM erp_records WHERE collection = $1', [change.collection]);
      else if (change.value !== undefined && change.id) await this.pool.query(
        `INSERT INTO erp_records (collection, id, data) VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [change.collection, change.id, JSON.stringify(change.value)],
      );
      else if (change.id) await this.pool.query('DELETE FROM erp_records WHERE collection = $1 AND id = $2', [change.collection, change.id]);
    });
    return this.writes;
  }

  async flush() { await this.writes; }
  async close() { await this.flush(); await this.pool.end(); }
}
