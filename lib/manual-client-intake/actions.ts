'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createPreMeetingInviteRequest,
  generateFinalProposalFromBaseOffer,
  parseLegalDataFormData,
  parsePreMeetingInviteRequestFormData,
  parsePreMeetingFormData,
  saveDiscoveryNotesFromForm,
  submitLegalDataIntake,
  submitPreMeetingIntake,
  updateBaseOfferFromForm,
  validateBaseOffer,
  type ManualIntakeResult,
} from './service';


export type PreMeetingInviteActionState = {
  success: boolean;
  message?: string;
  error?: string;
  warning?: string;
  formUrl?: string;
  leadId?: string;
  inviteId?: string;
  emailSent?: boolean;
  validationErrors?: Record<string, string[]>;
};
export type PublicIntakeActionState = {
  success: boolean;
  message?: string;
  error?: string;
  validationErrors?: Record<string, string[]>;
};

const initialError = 'Verifique os campos assinalados e tente novamente.';


export async function sendPreMeetingInviteRequestAction(
  _previousState: PreMeetingInviteActionState,
  formData: FormData,
): Promise<PreMeetingInviteActionState> {
  const parsed = parsePreMeetingInviteRequestFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: initialError,
      validationErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const result = await createPreMeetingInviteRequest(parsed.data);

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      validationErrors: result.validationErrors,
    };
  }

  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${result.leadId}`);

  return {
    success: true,
    message: result.message,
    warning: result.warning,
    formUrl: result.formUrl,
    leadId: result.leadId,
    inviteId: result.inviteId,
    emailSent: result.emailSent,
  };
}
export async function submitPreMeetingIntakeAction(
  _previousState: PublicIntakeActionState,
  formData: FormData,
): Promise<PublicIntakeActionState> {
  const parsed = parsePreMeetingFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: initialError,
      validationErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const result = await submitPreMeetingIntake(parsed.data);

  if (result.success) {
    redirect('/clientes/pre-reuniao/sucesso');
  }

  return toActionState(result);
}

export async function submitLegalDataIntakeAction(
  _previousState: PublicIntakeActionState,
  formData: FormData,
): Promise<PublicIntakeActionState> {
  const parsed = parseLegalDataFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: initialError,
      validationErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  return toActionState(await submitLegalDataIntake(parsed.data));
}

export async function updateBaseOfferAction(formData: FormData): Promise<void> {
  const leadId = await updateBaseOfferFromForm(formData);
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function validateBaseOfferAction(formData: FormData): Promise<void> {
  const baseOfferId = String(formData.get('baseOfferId') ?? '');
  const leadId = await validateBaseOffer(baseOfferId);
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function saveDiscoveryNotesAction(formData: FormData): Promise<void> {
  const leadId = await saveDiscoveryNotesFromForm(formData);
  revalidatePath(`/admin/leads/${leadId}`);
}

export async function generateFinalProposalFromBaseOfferAction(formData: FormData): Promise<void> {
  const baseOfferId = String(formData.get('baseOfferId') ?? '');
  const result = await generateFinalProposalFromBaseOffer(baseOfferId);
  revalidatePath(`/admin/leads/${result.leadId}`);
  redirect(`/admin/leads/${result.leadId}`);
}

function toActionState(result: ManualIntakeResult): PublicIntakeActionState {
  if (!result.success) {
    return {
      success: false,
      error: result.error,
      validationErrors: result.validationErrors,
    };
  }

  return {
    success: true,
    message: result.message,
  };
}