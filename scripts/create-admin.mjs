/**
 * Creates or updates a Norm8 Admin user without storing credentials in source code.
 *
 * Usage:
 *   npm run admin:create
 *   npm run admin:create -- --email norm8.ai@gmail.com
 *   INITIAL_ADMIN_EMAIL="norm8.ai@gmail.com" INITIAL_ADMIN_PASSWORD="..." npm run admin:create
 */

import 'dotenv/config';

import { randomBytes, randomUUID, scrypt as scryptCallback } from 'node:crypto';
import { stdin as input, stdout as output } from 'node:process';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline/promises';
import pg from 'pg';

const { Client } = pg;
const scrypt = promisify(scryptCallback);

function getArgValue(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function validatePasswordStrength(password) {
  const errors = [];

  if (password.length < 12) errors.push('mínimo de 12 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('uma letra maiúscula');
  if (!/[a-z]/.test(password)) errors.push('uma letra minúscula');
  if (!/[0-9]/.test(password)) errors.push('um número');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('um símbolo');

  return errors;
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const key = await scrypt(password, salt, 64);

  return `scrypt$${salt}$${key.toString('base64url')}`;
}

async function promptHidden(label) {
  if (!input.isTTY) {
    const rl = createInterface({ input, output });
    const value = await rl.question(label);
    rl.close();
    return value;
  }

  return new Promise((resolve) => {
    let value = '';
    output.write(label);
    input.setRawMode(true);
    input.resume();
    input.setEncoding('utf8');

    const onData = (char) => {
      if (char === '\u0003') {
        input.setRawMode(false);
        process.exit(1);
      }

      if (char === '\r' || char === '\n') {
        input.off('data', onData);
        input.setRawMode(false);
        output.write('\n');
        resolve(value);
        return;
      }

      if (char === '\u007f') {
        value = value.slice(0, -1);
        return;
      }

      value += char;
    };

    input.on('data', onData);
  });
}

function getDatabaseUrl() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL ou DIRECT_URL é obrigatória para criar o administrador.');
  }

  return url;
}

async function main() {
  const rl = createInterface({ input, output });
  const emailInput =
    getArgValue('email') ||
    process.env.INITIAL_ADMIN_EMAIL ||
    (await rl.question('Email do administrador: '));
  const nameInput =
    getArgValue('name') ||
    process.env.INITIAL_ADMIN_NAME ||
    (await rl.question('Nome (opcional): '));
  rl.close();

  const password = process.env.INITIAL_ADMIN_PASSWORD || (await promptHidden('Palavra-passe: '));
  const confirmation = process.env.INITIAL_ADMIN_PASSWORD || (await promptHidden('Confirmar palavra-passe: '));

  if (password !== confirmation) {
    throw new Error('As palavras-passe não coincidem.');
  }

  const passwordErrors = validatePasswordStrength(password);

  if (passwordErrors.length > 0) {
    throw new Error(`A palavra-passe deve conter: ${passwordErrors.join(', ')}.`);
  }

  const email = emailInput.trim();
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);
  const client = new Client({ connectionString: getDatabaseUrl() });

  await client.connect();

  try {
    await client.query(
      `INSERT INTO "AdminUser" (
        "id",
        "email",
        "normalizedEmail",
        "name",
        "passwordHash",
        "role",
        "isActive",
        "failedAttempts",
        "lockedUntil",
        "createdAt",
        "updatedAt"
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'ADMIN',
        true,
        0,
        NULL,
        NOW(),
        NOW()
      )
      ON CONFLICT ("normalizedEmail") DO UPDATE SET
        "email" = EXCLUDED."email",
        "name" = EXCLUDED."name",
        "passwordHash" = EXCLUDED."passwordHash",
        "role" = 'ADMIN',
        "isActive" = true,
        "failedAttempts" = 0,
        "lockedUntil" = NULL,
        "updatedAt" = NOW()`,
      [randomUUID(), email, normalizedEmail, nameInput.trim() || null, passwordHash],
    );

    console.log(`Administrador ativo criado/atualizado: ${normalizedEmail}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

