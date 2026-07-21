import 'server-only';

import type { ContractStatus, Prisma } from '@/app/generated/prisma/client';
import { requireAdmin } from '@/lib/admin/auth';
import { prisma } from '@/lib/db/prisma';

const contractInclude = {
  lead: { select: { id: true, company: true, name: true, email: true, phone: true, website: true } },
  proposal: {
    select: {
      id: true,
      title: true,
      status: true,
      estimatedValue: true,
      pdfUrl: true,
      leadId: true,
      companyName: true,
      contactName: true,
      painPoints: true,
      recommendedSolution: true,
      implementationPlan: true,
      nextSteps: true,
    },
  },
  meetingBooking: { select: { id: true, startsAt: true, endsAt: true, timezone: true, status: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  sections: { orderBy: { order: 'asc' } },
  phases: { orderBy: { order: 'asc' } },
  deliverables: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
  paymentMilestones: { orderBy: [{ expectedDate: 'asc' }, { createdAt: 'asc' }] },
  versions: { orderBy: { version: 'desc' }, include: { createdBy: { select: { name: true, email: true } } } },
  activityLogs: { orderBy: { createdAt: 'desc' }, include: { adminUser: { select: { name: true, email: true } } } },
} satisfies Prisma.ContractInclude;

export async function getContractsOverview() {
  await requireAdmin();

  const [contracts, total, drafts, awaitingSignature, signed, expiredOrCancelled] = await Promise.all([
    prisma.contract.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        lead: { select: { id: true, company: true, name: true, email: true } },
        proposal: { select: { id: true, title: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.contract.count(),
    prisma.contract.count({ where: { status: 'DRAFT' } }),
    prisma.contract.count({ where: { status: 'AWAITING_SIGNATURE' } }),
    prisma.contract.count({ where: { status: 'SIGNED' } }),
    prisma.contract.count({ where: { status: { in: ['EXPIRED', 'CANCELLED'] } } }),
  ]);

  const signedContracts = contracts.filter((contract) => contract.status === 'SIGNED');
  const contractedValue = signedContracts.reduce((totalValue, contract) => {
    const value = contract.estimatedValue ? Number(contract.estimatedValue.toString()) : 0;
    return Number.isFinite(value) ? totalValue + value : totalValue;
  }, 0);

  return { contracts, metrics: { total, drafts, awaitingSignature, signed, contractedValue, expiredOrCancelled } };
}

export async function getContractCreationContext() {
  const currentAdmin = await requireAdmin();

  const [leads, proposals, admins, legalSettings, templates] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: { id: true, company: true, name: true, email: true, phone: true, website: true },
    }),
    prisma.proposal.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        leadId: true,
        companyName: true,
        contactName: true,
        estimatedValue: true,
        painPoints: true,
        recommendedSolution: true,
        implementationPlan: true,
        nextSteps: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.adminUser.findMany({
      where: { isActive: true },
      orderBy: { email: 'asc' },
      select: { id: true, name: true, email: true },
    }),
    prisma.companyLegalSettings.findUnique({ where: { key: 'default' } }),
    prisma.contractTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
      include: { sections: { where: { isActive: true }, orderBy: { order: 'asc' } } },
    }),
  ]);

  const currentAdminOption = admins.find((admin) => admin.id === currentAdmin.id || admin.email.toLowerCase() === currentAdmin.email.toLowerCase()) ?? null;
  const currentAdminId = currentAdminOption?.id ?? null;

  return { leads, proposals, admins, currentAdminId, legalSettings, templates };
}

export async function getContractById(id: string) {
  await requireAdmin();
  return prisma.contract.findUnique({ where: { id }, include: contractInclude });
}

export async function getContractEditorContext(id: string) {
  await requireAdmin();
  const [contract, context] = await Promise.all([getContractById(id), getContractCreationContext()]);
  return { contract, ...context };
}

export async function getCompanyLegalSettings() {
  await requireAdmin();
  return prisma.companyLegalSettings.findUnique({ where: { key: 'default' } });
}

export function buildContractWhereFromStatus(status?: ContractStatus | 'ALL'): Prisma.ContractWhereInput {
  return status && status !== 'ALL' ? { status } : {};
}