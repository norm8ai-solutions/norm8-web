/**
 * ------------------------------------------------------------------
 * File: lib/admin/auth.ts
 * Description: Secure server-side authentication helpers for Norm8 Admin.
 * Responsibilities:
 * - Hash and verify admin passwords with Node scrypt.
 * - Create, validate and revoke database-backed admin sessions.
 * - Expose requireAdmin for pages, server actions and route handlers.
 * - Record security-relevant authentication events without secrets.
 * ------------------------------------------------------------------
 */

import 'server-only';

import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AdminRole } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/db/prisma';

const scrypt = promisify(scryptCallback);

export const ADMIN_SESSION_COOKIE = 'norm8_admin_session';
export const ADMIN_LOGIN_ERROR_MESSAGE = 'Não foi possível iniciar sessão. Verifica os dados introduzidos.';
export const ADMIN_LOGIN_UNAVAILABLE_MESSAGE = 'Não foi possível iniciar sessão neste momento. Tenta novamente mais tarde.';

const DEMO_ADMIN: AuthenticatedAdmin = {
  id: 'demo-admin',
  email: 'demo@norm8.pt',
  name: 'Norm8 Demo Admin',
  role: 'ADMIN',
};

/**
 * TEMPORARY DEMO MODE:
 * Used only for local presentation demos. Do not enable in production.
 */
export function isAdminAuthDisabledForDemo(): boolean {
  const enabled = process.env.DISABLE_ADMIN_AUTH_FOR_DEMO === 'true';

  if (enabled && process.env.NODE_ENV === 'production') {
    console.warn(
      'DISABLE_ADMIN_AUTH_FOR_DEMO=true was ignored in production. Admin authentication remains enabled.',
    );
    return false;
  }

  return enabled;
}

export function getDemoAdmin(): AuthenticatedAdmin {
  return DEMO_ADMIN;
}

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const MAX_IP_FAILURES = 20;
const SCRYPT_KEY_LENGTH = 64;

type AdminRequestMetadata = {
  ipHash: string | null;
  userAgent: string | null;
};

export type AuthenticatedAdmin = {
  id: string;
  email: string;
  name: string | null;
  role: AdminRole;
};

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateAdminPasswordStrength(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 12) errors.push('mínimo de 12 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('uma letra maiúscula');
  if (!/[a-z]/.test(password)) errors.push('uma letra minúscula');
  if (!/[0-9]/.test(password)) errors.push('um número');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('um símbolo');

  return errors;
}

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url');
  const key = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;

  return `scrypt$${salt}$${key.toString('base64url')}`;
}

export async function verifyAdminPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, hash] = storedHash.split('$');

  if (algorithm !== 'scrypt' || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, 'base64url');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function getAdminRequestMetadata(): Promise<AdminRequestMetadata> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = headerStore.get('x-real-ip')?.trim();
  const ip = forwardedFor || realIp || null;
  const userAgent = headerStore.get('user-agent')?.slice(0, 240) || null;

  return {
    ipHash: ip ? createHash('sha256').update(`${getAuthSecret()}:${ip}`).digest('hex') : null,
    userAgent,
  };
}

export async function loginAdminWithPassword(input: {
  email: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string; reason?: 'DATABASE_UNAVAILABLE' }> {
  if (isAdminAuthDisabledForDemo()) {
    return { ok: true };
  }

  const email = normalizeAdminEmail(input.email);
  const metadata = await getAdminRequestMetadata();

  try {
    return await executeAdminPasswordLogin({
      email,
      password: input.password,
      metadata,
    });
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      console.error(
        'Database connection failed during admin login. Check DATABASE_URL, Supabase status and whether the project requires the Supabase pooler.',
        getSafePrismaErrorContext(error),
      );

      return {
        ok: false,
        error: ADMIN_LOGIN_UNAVAILABLE_MESSAGE,
        reason: 'DATABASE_UNAVAILABLE',
      };
    }

    throw error;
  }
}

async function executeAdminPasswordLogin(input: {
  email: string;
  password: string;
  metadata: AdminRequestMetadata;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { email, metadata, password } = input;

  if (!email || !password) {
    await logAdminAuthEvent({ event: 'LOGIN_FAILED', email, ...metadata });
    return { ok: false, error: ADMIN_LOGIN_ERROR_MESSAGE };
  }

  if (metadata.ipHash) {
    const recentIpFailures = await countRecentAuthFailuresByIp(metadata.ipHash);

    if (recentIpFailures >= MAX_IP_FAILURES) {
      await logAdminAuthEvent({ event: 'LOGIN_BLOCKED', email, ...metadata });
      return { ok: false, error: ADMIN_LOGIN_ERROR_MESSAGE };
    }
  }

  const admin = await prisma.adminUser.findUnique({
    where: { normalizedEmail: email },
  });

  if (!admin) {
    await logAdminAuthEvent({ event: 'LOGIN_FAILED', email, ...metadata });
    return { ok: false, error: ADMIN_LOGIN_ERROR_MESSAGE };
  }

  if (!admin.isActive || (admin.lockedUntil && admin.lockedUntil > new Date())) {
    await logAdminAuthEvent({ adminUserId: admin.id, event: 'LOGIN_BLOCKED', email, ...metadata });
    return { ok: false, error: ADMIN_LOGIN_ERROR_MESSAGE };
  }

  const passwordOk = await verifyAdminPassword(password, admin.passwordHash);

  if (!passwordOk) {
    const failedAttempts = admin.failedAttempts + 1;
    const lockedUntil = failedAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOGIN_LOCK_MS) : null;

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { failedAttempts, lockedUntil },
    });

    await logAdminAuthEvent({
      adminUserId: admin.id,
      event: lockedUntil ? 'LOGIN_BLOCKED' : 'LOGIN_FAILED',
      email,
      ...metadata,
    });

    return { ok: false, error: ADMIN_LOGIN_ERROR_MESSAGE };
  }

  const rawToken = randomBytes(32).toString('base64url');
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        failedAttempts: 0,
        lastLoginAt: new Date(),
        lockedUntil: null,
      },
    }),
    prisma.adminSession.create({
      data: {
        adminUserId: admin.id,
        tokenHash,
        expiresAt,
        ipHash: metadata.ipHash,
        userAgent: metadata.userAgent,
      },
    }),
    createAdminAuthLogQuery({
      adminUserId: admin.id,
      event: 'LOGIN_SUCCESS',
      email,
      ipHash: metadata.ipHash,
      userAgent: metadata.userAgent,
    }),
  ]);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, rawToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/admin',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  return { ok: true };
}

export async function getCurrentAdmin(): Promise<AuthenticatedAdmin | null> {
  if (isAdminAuthDisabledForDemo()) {
    return getDemoAdmin();
  }

  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

  if (!rawToken) {
    return null;
  }

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: hashSessionToken(rawToken) },
    include: { adminUser: true },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.adminUser.isActive
  ) {
    return null;
  }

  await prisma.adminSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return {
    id: session.adminUser.id,
    email: session.adminUser.email,
    name: session.adminUser.name,
    role: session.adminUser.role,
  };
}

export async function requireAdmin(allowedRoles: AdminRole[] = ['ADMIN', 'OPERATOR']): Promise<AuthenticatedAdmin> {
  if (isAdminAuthDisabledForDemo()) {
    const demoAdmin = getDemoAdmin();

    if (allowedRoles.includes(demoAdmin.role)) {
      return demoAdmin;
    }
  }

  const admin = await getCurrentAdmin();

  if (!admin || !allowedRoles.includes(admin.role)) {
    redirect('/admin/login');
  }

  return admin;
}

export async function revokeCurrentAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const metadata = await getAdminRequestMetadata();

  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    const session = await prisma.adminSession.findUnique({ where: { tokenHash } });

    if (session && !session.revokedAt) {
      await prisma.$transaction([
        prisma.adminSession.update({
          where: { id: session.id },
          data: { revokedAt: new Date() },
        }),
        createAdminAuthLogQuery({
          adminUserId: session.adminUserId,
          event: 'LOGOUT',
          ipHash: metadata.ipHash,
          userAgent: metadata.userAgent,
        }),
      ]);
    }
  }

  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export function sanitizeAdminRedirect(value: string | null | undefined): string {
  if (!value || !value.startsWith('/admin') || value.startsWith('/admin/login')) {
    return '/admin';
  }

  if (value.startsWith('//') || value.includes('://')) {
    return '/admin';
  }

  return value;
}

export function hashSessionToken(rawToken: string): string {
  return createHash('sha256').update(`${getAuthSecret()}:${rawToken}`).digest('hex');
}

function isPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: unknown; message?: unknown; name?: unknown };
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  const name = typeof candidate.name === 'string' ? candidate.name : '';

  return (
    candidate.code === 'P1001' ||
    name === 'PrismaClientInitializationError' ||
    message.includes("Can't reach database server") ||
    message.includes('Timed out fetching a new connection') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('ETIMEDOUT')
  );
}

function getSafePrismaErrorContext(error: unknown): { code?: unknown; name?: unknown } {
  if (!error || typeof error !== 'object') {
    return {};
  }

  const candidate = error as { code?: unknown; name?: unknown };

  return {
    code: candidate.code,
    name: candidate.name,
  };
}

function assertAdminAuthLogDelegate() {
  if (!('adminAuthLog' in prisma) || !prisma.adminAuthLog) {
    throw new Error(
      'Prisma delegate adminAuthLog não existe. Executa npx prisma generate e reinicia o servidor Next.js para limpar o Prisma Client antigo em memória.',
    );
  }

  return prisma.adminAuthLog;
}

async function countRecentAuthFailuresByIp(ipHash: string): Promise<number> {
  return assertAdminAuthLogDelegate().count({
    where: {
      ipHash,
      event: { in: ['LOGIN_FAILED', 'LOGIN_BLOCKED'] },
      createdAt: { gte: new Date(Date.now() - LOGIN_LOCK_MS) },
    },
  });
}

function createAdminAuthLogQuery(input: {
  adminUserId?: string;
  event: string;
  email?: string;
  ipHash?: string | null;
  userAgent?: string | null;
}) {
  return assertAdminAuthLogDelegate().create({
    data: {
      adminUserId: input.adminUserId,
      event: input.event,
      email: input.email || null,
      ipHash: input.ipHash ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

async function logAdminAuthEvent(input: {
  adminUserId?: string;
  event: string;
  email?: string;
  ipHash?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await createAdminAuthLogQuery(input);
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || 'norm8-development-auth-secret-change-me';
}
