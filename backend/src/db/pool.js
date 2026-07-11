import pg from 'pg';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('db-pool');


/** Pool de conexões compartilhado com o PostgreSQL */

export const pool = new pg.Pool({
  host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT || 5432),
  database: process.env.POSTGRES_DB || process.env.DB_NAME || 'hospital_db',
  user: process.env.POSTGRES_USER || process.env.DB_USER || 'hospital',
  password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'hospital123',
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error('Erro inesperado em conexão ociosa do pool PostgreSQL', {
    error: err.message,
  });
});

/** Executa uma consulta parametrizada e devolve apenas as linhas. */

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}
