/**
 * Diagnoses Norm8 database connectivity without printing secrets.
 *
 * Usage:
 *   npm run db:doctor
 */

import nextEnv from '@next/env';
import dns from 'node:dns/promises';
import net from 'node:net';
import process from 'node:process';
import pg from 'pg';

const { Client } = pg;
const projectDir = process.cwd();
const { loadEnvConfig } = nextEnv;
loadEnvConfig(projectDir, process.env.NODE_ENV !== 'production');

const CONNECTION_TIMEOUT_MS = 8_000;

function parseDatabaseUrl(name) {
  const raw = process.env[name];

  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(raw);

    return {
      name,
      raw,
      protocol: parsed.protocol,
      username: parsed.username,
      hostname: parsed.hostname,
      port: parsed.port || defaultPortForProtocol(parsed.protocol),
      pathname: parsed.pathname,
      searchParams: parsed.searchParams,
      redacted: `${parsed.protocol}//${parsed.username || 'user'}:***@${parsed.hostname}:${
        parsed.port || defaultPortForProtocol(parsed.protocol)
      }${parsed.pathname}${parsed.search}`,
    };
  } catch {
    return {
      name,
      raw,
      error: 'URL inválida ou mal formatada.',
    };
  }
}

function defaultPortForProtocol(protocol) {
  return protocol === 'postgresql:' || protocol === 'postgres:' ? '5432' : '';
}

function printUrlSummary(info) {
  if (!info) {
    return;
  }

  console.log(`${info.name}: ${info.redacted ?? 'INVALID'}`);

  if (info.error) {
    console.log(`${info.name} parse: FAILED - ${info.error}`);
    return;
  }

  console.log(`${info.name} host: ${info.hostname}`);
  console.log(`${info.name} port: ${info.port}`);
  console.log(`${info.name} sslmode: ${info.searchParams.get('sslmode') || '(não definido)'}`);
  console.log(`${info.name} pgbouncer: ${info.searchParams.get('pgbouncer') || '(não definido)'}`);
  console.log(`${info.name} pooler: ${info.hostname.includes('pooler.supabase.com') ? 'yes' : 'no'}`);
}

async function diagnoseDns(info) {
  if (!info || info.error) {
    return false;
  }

  try {
    const records = await dns.lookup(info.hostname, { all: true });
    const families = [...new Set(records.map((record) => `IPv${record.family}`))].join(', ');
    console.log(`${info.name} DNS: OK (${families})`);
    return true;
  } catch (error) {
    console.log(`${info.name} DNS: FAILED (${error.code ?? error.message})`);
    return false;
  }
}

async function diagnoseTcp(info) {
  if (!info || info.error) {
    return false;
  }

  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: info.hostname,
      port: Number(info.port),
      timeout: CONNECTION_TIMEOUT_MS,
    });

    socket.once('connect', () => {
      console.log(`${info.name} TCP: OK`);
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      console.log(`${info.name} TCP: FAILED (timeout)`);
      socket.destroy();
      resolve(false);
    });

    socket.once('error', (error) => {
      console.log(`${info.name} TCP: FAILED (${error.code ?? error.message})`);
      resolve(false);
    });
  });
}

async function diagnosePostgres(info) {
  if (!info || info.error) {
    return false;
  }

  const client = new Client({
    connectionString: info.raw,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });

  try {
    await client.connect();
    console.log(`${info.name} Postgres connect: OK`);

    await runCount(client, 'AdminUser');
    await runCount(client, 'AdminAuthLog');
    await runCount(client, 'AdminSession');

    return true;
  } catch (error) {
    console.log(`${info.name} Postgres connect/query: FAILED`);
    console.log(`Code: ${error.code ?? error.name ?? 'UNKNOWN'}`);
    console.log(`Reason: ${safeErrorMessage(error)}`);
    printLikelyCause(error, info);
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function runCount(client, tableName) {
  try {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM "${tableName}"`);
    console.log(`${tableName} count: OK (${result.rows[0]?.count ?? 0})`);
  } catch (error) {
    console.log(`${tableName} count: FAILED (${error.code ?? error.message})`);
  }
}

function safeErrorMessage(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, 'postgresql://***');
}

function printLikelyCause(error, info) {
  const code = error?.code;

  if (code === 'ENOTFOUND') {
    console.log('Likely cause: host inválido, DNS indisponível ou connection string antiga.');
    return;
  }

  if (code === 'ETIMEDOUT' || code === 'ECONNREFUSED') {
    console.log('Likely cause: host/porta inacessível, direct connection bloqueada ou Supabase pausado.');
    return;
  }

  if (code === '28P01') {
    console.log('Likely cause: password da base de dados incorreta ou não URL-encoded.');
    return;
  }

  if (code === '3D000') {
    console.log('Likely cause: nome da database incorreto.');
    return;
  }

  if (!info.hostname.includes('pooler.supabase.com')) {
    console.log('Likely cause: direct connection Supabase inacessível localmente; usar Transaction Pooler em DATABASE_URL.');
    return;
  }

  console.log('Likely cause: DATABASE_URL inválida, Supabase inativo, password errada ou pooler incorreto.');
}

async function main() {
  console.log('Norm8 DB Doctor');
  console.log('----------------');

  const databaseUrl = parseDatabaseUrl('DATABASE_URL');
  const directUrl = parseDatabaseUrl('DIRECT_URL');

  if (!databaseUrl) {
    console.log('DATABASE_URL: missing');
    process.exitCode = 1;
    return;
  }

  printUrlSummary(databaseUrl);
  if (directUrl) {
    printUrlSummary(directUrl);
  } else {
    console.log('DIRECT_URL: missing (recomendado para Prisma migrations com Supabase)');
  }

  console.log('');
  await diagnoseDns(databaseUrl);
  await diagnoseTcp(databaseUrl);
  const runtimeOk = await diagnosePostgres(databaseUrl);

  if (directUrl) {
    console.log('');
    await diagnoseDns(directUrl);
    await diagnoseTcp(directUrl);
    await diagnosePostgres(directUrl);
  }

  if (!runtimeOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('db:doctor failed unexpectedly:', safeErrorMessage(error));
  process.exitCode = 1;
});
