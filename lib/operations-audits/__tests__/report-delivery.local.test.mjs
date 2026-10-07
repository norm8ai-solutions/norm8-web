import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = value => Buffer.from(`%PDF-1.7\n${value}\n%%EOF`);

class MemoryDeliveryRepository {
  constructor() { this.rows = new Map(); this.sequence = 0; }
  async create(data) { const id = `delivery-${++this.sequence}`; const row = { id, ...data, createdAt: new Date(0), updatedAt: new Date(0) }; this.rows.set(id, row); return row; }
  async find(id, auditId) { const row = this.rows.get(id); return row && row.auditId === auditId ? row : null; }
  async claimFailed(id, auditId) { const row = await this.find(id, auditId); if (!row || row.status !== 'FAILED') return false; row.status = 'PENDING'; row.failureReason = null; return true; }
  async update(id, data) { const row = this.rows.get(id); Object.assign(row, data); return row; }
  async history(auditId, pilotProposalId) { return [...this.rows.values()].filter(row => row.auditId === auditId && (!pilotProposalId || row.pilotProposalId === pilotProposalId)).map(({ pdfBytes, ...metadata }) => metadata); }
  async file(id, auditId) { const row = await this.find(id, auditId); return row ? { pdfBytes: row.pdfBytes, fileName: row.fileName, fileSha256: row.fileSha256, fileSizeBytes: row.fileSizeBytes } : null; }
}

class FakeProvider {
  constructor() { this.calls = []; this.failure = null; }
  async send(input) { this.calls.push(input); if (this.failure) throw new Error(this.failure); return { id: `test-message-${this.calls.length}` }; }
}

const send = async ({ repo, provider, renderer, input, now = new Date(0) }) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.recipientEmail)) throw new Error('INVALID_RECIPIENT');
  if (!input.subject || input.subject.length > 180) throw new Error('INVALID_SUBJECT');
  if (!input.message || input.message.length > 10000) throw new Error('INVALID_MESSAGE');
  const pdfBytes = await renderer(input.source);
  const row = await repo.create({ auditId: input.auditId, pilotProposalId: input.pilotProposalId ?? null, reportType: input.reportType, channel: 'EMAIL', status: 'PENDING', recipientEmail: input.recipientEmail, subject: input.subject, message: input.message, generatedAt: now, sentAt: null, providerMessageId: null, fileName: input.fileName, fileSizeBytes: pdfBytes.length, fileSha256: sha(pdfBytes), pdfBytes, failureReason: null });
  try { const result = await provider.send({ to: row.recipientEmail, subject: row.subject, text: row.message, attachment: row.pdfBytes }); return repo.update(row.id, { status: 'SENT', sentAt: now, providerMessageId: result.id }); }
  catch (error) { await repo.update(row.id, { status: 'FAILED', failureReason: String(error.message).slice(0, 1000) }); throw error; }
};

const retry = async ({ repo, provider, auditId, deliveryId, sentAt = new Date(0) }) => {
  if (!await repo.claimFailed(deliveryId, auditId)) throw new Error('DELIVERY_NOT_FAILED');
  const row = await repo.find(deliveryId, auditId);
  try { const result = await provider.send({ to: row.recipientEmail, subject: row.subject, text: row.message, attachment: row.pdfBytes }); return repo.update(row.id, { status: 'SENT', sentAt, providerMessageId: result.id }); }
  catch (error) { await repo.update(row.id, { status: 'FAILED', failureReason: String(error.message).slice(0, 1000) }); throw error; }
};

const input = { auditId: 'audit-a', reportType: 'AUDIT_REPORT', recipientEmail: 'developer@example.test', subject: 'Report', message: 'Body', fileName: 'report.pdf', source: 'A' };

test('snapshot integrity, size and hash', async () => { const repo = new MemoryDeliveryRepository(); const provider = new FakeProvider(); const row = await send({ repo, provider, renderer: async source => bytes(source), input }); assert.equal(row.pdfBytes.subarray(0, 4).toString(), '%PDF'); assert.equal(row.fileSizeBytes, row.pdfBytes.length); assert.equal(row.fileSha256, sha(row.pdfBytes)); const changed = bytes('B'); assert.notEqual(row.fileSha256, sha(changed)); });
test('provider success persists SENT and provider id', async () => { const repo = new MemoryDeliveryRepository(); const provider = new FakeProvider(); const row = await send({ repo, provider, renderer: async () => bytes('A'), input }); assert.equal(row.status, 'SENT'); assert.equal(row.providerMessageId, 'test-message-1'); assert.equal(row.failureReason, null); assert.deepEqual(provider.calls[0].attachment, row.pdfBytes); });
test('provider failure preserves artifact and records safe reason', async () => { const repo = new MemoryDeliveryRepository(); const provider = new FakeProvider(); provider.failure = 'provider unavailable'; await assert.rejects(() => send({ repo, provider, renderer: async () => bytes('A'), input })); const row = [...repo.rows.values()][0]; assert.equal(row.status, 'FAILED'); assert.equal(row.sentAt, null); assert.ok(row.failureReason); assert.ok(row.pdfBytes.length > 0); assert.equal(row.fileSha256, sha(row.pdfBytes)); });
test('retry reuses A while new send generates B', async () => { const repo = new MemoryDeliveryRepository(); const provider = new FakeProvider(); provider.failure = 'offline'; await assert.rejects(() => send({ repo, provider, renderer: async source => bytes(source), input })); const failed = [...repo.rows.values()][0]; const original = failed.fileSha256; provider.failure = null; let rendererCalls = 0; const retried = await retry({ repo, provider, auditId: input.auditId, deliveryId: failed.id }); assert.equal(retried.fileSha256, original); assert.deepEqual(provider.calls.at(-1).attachment, bytes('A')); const fresh = await send({ repo, provider, renderer: async source => { rendererCalls++; return bytes(source); }, input: { ...input, source: 'B' } }); assert.equal(rendererCalls, 1); assert.notEqual(fresh.fileSha256, original); });
test('atomic retry claim allows only one concurrent provider call', async () => { const repo = new MemoryDeliveryRepository(); const provider = new FakeProvider(); provider.failure = 'offline'; await assert.rejects(() => send({ repo, provider, renderer: async () => bytes('A'), input })); const failed = [...repo.rows.values()][0]; provider.failure = null; const results = await Promise.allSettled([retry({ repo, provider, auditId: input.auditId, deliveryId: failed.id }), retry({ repo, provider, auditId: input.auditId, deliveryId: failed.id })]); assert.equal(provider.calls.length, 2); assert.equal(results.filter(result => result.status === 'fulfilled').length, 1); assert.equal(results.filter(result => result.status === 'rejected').length, 1); });
test('SENT and PENDING cannot be retried', async () => { const repo = new MemoryDeliveryRepository(); const provider = new FakeProvider(); const sent = await send({ repo, provider, renderer: async () => bytes('A'), input }); await assert.rejects(() => retry({ repo, provider, auditId: input.auditId, deliveryId: sent.id })); const pending = await repo.create({ ...sent, id: undefined, status: 'PENDING' }); await assert.rejects(() => retry({ repo, provider, auditId: input.auditId, deliveryId: pending.id })); assert.equal(provider.calls.length, 1); });
test('scope, history metadata and historical bytes are isolated', async () => { const repo = new MemoryDeliveryRepository(); const provider = new FakeProvider(); const a = await send({ repo, provider, renderer: async () => bytes('A'), input }); const b = await send({ repo, provider, renderer: async () => bytes('B'), input: { ...input, auditId: 'audit-b', pilotProposalId: 'pilot-b', reportType: 'PILOT_REPORT' } }); assert.equal(await repo.file(b.id, 'audit-a'), null); assert.deepEqual((await repo.file(a.id, 'audit-a')).pdfBytes, bytes('A')); assert.equal((await repo.history('audit-a'))[0].pdfBytes, undefined); assert.equal((await repo.history('audit-a')).length, 1); });
test('validation rejects before renderer/provider', async () => { const repo = new MemoryDeliveryRepository(); const provider = new FakeProvider(); let calls = 0; const renderer = async () => { calls++; return bytes('A'); }; for (const bad of [{ recipientEmail: 'bad' }, { subject: '' }, { subject: 'x'.repeat(181) }, { message: '' }, { message: 'x'.repeat(10001) }]) await assert.rejects(() => send({ repo, provider, renderer, input: { ...input, ...bad } })); assert.equal(calls, 0); assert.equal(provider.calls.length, 0); });
test('production boundary review: auth, scoped binary select, no public URL', async () => { const actions = await readFile('lib/operations-audits/actions.ts', 'utf8'); const route = await readFile('app/admin/operations-audits/[id]/report-deliveries/[deliveryId]/file/route.ts', 'utf8'); const service = await readFile('lib/operations-audits/report-delivery.ts', 'utf8'); assert.match(actions, /sendAuditReportAction/); assert.match(actions, /sendPilotReportAction/); assert.match(actions, /retryReportDeliveryAction/); assert.match(route, /requireAdmin/); assert.match(service, /auditId: input\.auditId/); assert.match(service, /pdfBytes/); assert.match(service, /storageKey: `operations-audits\//); assert.doesNotMatch(service, /storageKey:.*recipientEmail/); });
