import type { APIRoute } from 'astro';
import { dbClient } from '../lib/db.client';

export type HealthStatus = 'ok' | 'unhealthy';
export type HealthCheckStatus = 'up' | 'down';

export interface HealthEndpointResponse {
  service: string;
  status: HealthStatus;
  timestamp: string;
  checks: {
    database: DatabaseHealthCheck;
  };
}

export interface DatabaseHealthCheck {
  status: HealthCheckStatus;
  latencyMs?: number;
  error?: 'database_ping_failed';
}

const jsonHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

export const GET: APIRoute = async () => {
  const database = await getDatabaseHealthCheck();
  const status: HealthStatus = database.status === 'up' ? 'ok' : 'unhealthy';
  const response: HealthEndpointResponse = {
    checks: {
      database,
    },
    service: 'stream-coworking',
    status,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    headers: jsonHeaders,
    status: status === 'ok' ? 200 : 503,
  });
};

async function getDatabaseHealthCheck(): Promise<DatabaseHealthCheck> {
  const startedAt = Date.now();

  try {
    await dbClient.$queryRaw`SELECT 1`;

    return {
      latencyMs: Date.now() - startedAt,
      status: 'up',
    };
  } catch(err) {
    console.error('Health check database ping failed', err);

    return {
      error: 'database_ping_failed',
      status: 'down',
    };
  }
}
