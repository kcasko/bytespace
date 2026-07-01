import { query } from './pool.js';

export async function testConnection() {
  const result = await query('SELECT NOW() AS database_time');
  return result.rows[0].database_time;
}
