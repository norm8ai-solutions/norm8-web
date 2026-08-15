'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import {
  completeDiscoveryFromForm,
  saveDiscoveryQuestionsFromForm,
  saveDiscoverySessionFromForm,
  saveDiscoveryWorkspaceFromForm,
  startDiscoveryPreparationFromBaseOffer,
  type DiscoverySaveResult,
} from '@/lib/admin/discovery';

export type DiscoveryActionState = {
  success: boolean;
  message?: string;
  error?: string;
};


export async function prepareDiscoveryAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const baseOfferId = String(formData.get('baseOfferId') ?? '').trim();
  const result = await startDiscoveryPreparationFromBaseOffer(baseOfferId);

  revalidatePath(`/admin/leads/${result.leadId}`);
  revalidatePath(`/admin/leads/${result.leadId}/discovery`);
  redirect(`/admin/leads/${result.leadId}/discovery`);
}

export async function saveDiscoverySessionAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const result = await saveDiscoverySessionFromForm(formData);

  if (!result.success) {
    throw new Error(result.error);
  }

  revalidateDiscoveryPaths(result);
}



export async function completeDiscoveryAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  await requireAdmin();

  try {
    const result = await completeDiscoveryFromForm(formData);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidateDiscoveryPaths(result);

    return { success: true, message: 'Discovery marcada como concluída.' };
  } catch (error) {
    console.error('Failed to complete Discovery', error);
    return { success: false, error: 'Não foi possível concluir a discovery. Tente novamente.' };
  }
}

export async function saveDiscoveryNotesAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  await requireAdmin();

  try {
    const result = await saveDiscoveryWorkspaceFromForm(formData);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidateDiscoveryPaths(result);

    const intent = String(formData.get('intent') ?? 'discovery');

    return {
      success: true,
      message: intent === 'base-offer' ? 'Oferta Base guardada com sucesso.' : 'Discovery guardada com sucesso.',
    };
  } catch (error) {
    console.error('Failed to save Discovery notes', error);
    const intent = String(formData.get('intent') ?? 'discovery');
    return {
      success: false,
      error: intent === 'base-offer'
        ? 'Não foi possível guardar a Oferta Base. Tente novamente.'
        : 'Não foi possível guardar a discovery. Tente novamente.',
    };
  }
}

export async function saveDiscoveryQuestionsAction(
  _previousState: DiscoveryActionState,
  formData: FormData,
): Promise<DiscoveryActionState> {
  await requireAdmin();

  try {
    const result = await saveDiscoveryQuestionsFromForm(formData);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    revalidateDiscoveryPaths(result);

    return { success: true, message: result.message };
  } catch (error) {
    console.error('Failed to save Discovery workspace', error);
    return { success: false, error: 'Não foi possível guardar a discovery. Tente novamente.' };
  }
}

function revalidateDiscoveryPaths(result: DiscoverySaveResult): void {
  if (!result.success) {
    return;
  }

  revalidatePath(`/admin/leads/${result.leadId}`);
  revalidatePath(`/admin/leads/${result.leadId}/discovery`);
}