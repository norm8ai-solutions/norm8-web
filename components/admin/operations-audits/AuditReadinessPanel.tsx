import Link from 'next/link';
import { AdminBadge } from '@/components/admin/AdminBadge';
import type { AuditReadiness, ReadinessCheck } from '@/lib/operations-audits/readiness';

const tone: Record<ReadinessCheck['status'], 'green' | 'slate' | 'yellow' | 'red'> = { PASS: 'green', INFO: 'slate', WARNING: 'yellow', BLOCKING: 'red' };
const label: Record<ReadinessCheck['status'], string> = { PASS: 'Complete', INFO: 'Info', WARNING: 'Warning', BLOCKING: 'Blocking' };
export function AuditReadinessPanel({ readiness, auditId, detail = false }: { readiness: AuditReadiness; auditId: string; detail?: boolean }) {
  return <div className="readiness-panel"><div className="readiness-summary"><div><span className="admin-field-label">Status</span><AdminBadge tone={readiness.status === 'REVIEW_READY' ? 'green' : readiness.status === 'HAS_BLOCKING_ISSUES' ? 'red' : 'blue'}>{readiness.status.replaceAll('_', ' ')}</AdminBadge></div><div><strong>{readiness.completedChecks}</strong><span>Completed checks</span></div><div><strong>{readiness.blockingIssues.length}</strong><span>Blocking issues</span></div><div><strong>{readiness.warnings.length}</strong><span>Warnings</span></div></div>{!detail ? <Link className="admin-link" href={`/admin/operations-audits/${auditId}/readiness`}>View readiness details</Link> : <div className="readiness-check-list">{readiness.checks.map((item) => <div className="readiness-check" key={item.id}><AdminBadge tone={tone[item.status]}>{label[item.status]}</AdminBadge><div><strong>{item.name}</strong><p>{item.reason}</p>{item.entityLabel ? <span className="admin-row-meta">{item.entityLabel}</span> : null}</div>{item.href ? <Link className="admin-link" href={item.href}>Review</Link> : null}</div>)}</div>}</div>;
}
