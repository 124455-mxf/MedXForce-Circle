import type { PatientProvisionRecord } from '@medxforce/shared';
import type { User } from 'firebase/auth';

function patientApiBaseUrl(): string | null {
  const explicit = (import.meta.env.VITE_MEDXFORCE_API_URL as string | undefined)?.trim();
  return explicit ? explicit.replace(/\/$/, '') : null;
}

function patientAppUrlOverride(): string | undefined {
  const explicit = (import.meta.env.VITE_MEDXFORCE_API_URL as string | undefined)?.trim();
  return explicit ? explicit.replace(/\/$/, '') : undefined;
}

export type PatientProvisionSetupEmailResult = {
  success: boolean;
  message?: string;
  patientSent?: boolean;
  proxySent?: boolean;
};

export function provisionSetupEmailToastKey(
  result: PatientProvisionSetupEmailResult,
): 'setupEmailsSentBoth' | 'setupEmailSentPatient' | 'setupEmailSentProxy' | 'setupEmailsSent' | 'setupEmailsFailed' {
  if (!result.success) return 'setupEmailsFailed';
  if (result.patientSent && result.proxySent) return 'setupEmailsSentBoth';
  if (result.patientSent) return 'setupEmailSentPatient';
  if (result.proxySent) return 'setupEmailSentProxy';
  return 'setupEmailsSent';
}

export async function sendPatientProvisionSetupEmails(params: {
  provision: Pick<PatientProvisionRecord, 'displayName' | 'setupCode' | 'intendedEmail'>;
  proxyUser: Pick<User, 'email' | 'displayName'>;
}): Promise<PatientProvisionSetupEmailResult> {
  const base = patientApiBaseUrl();
  if (!base) {
    return { success: false, message: 'Patient API URL not configured.' };
  }

  const proxyEmail = params.proxyUser.email?.trim() || '';
  const intendedEmail = params.provision.intendedEmail?.trim() || '';
  if (!proxyEmail && !intendedEmail) {
    return { success: false, message: 'No recipient email available.' };
  }

  try {
    const res = await fetch(`${base}/api/send-patient-provision-setup-emails`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName: params.provision.displayName,
        setupCode: params.provision.setupCode,
        intendedEmail: intendedEmail || undefined,
        proxyEmail: proxyEmail || undefined,
        proxyName: params.proxyUser.displayName?.trim() || undefined,
        patientAppUrl: patientAppUrlOverride(),
      }),
    });

    let data: PatientProvisionSetupEmailResult = { success: false };
    try {
      data = (await res.json()) as PatientProvisionSetupEmailResult;
    } catch {
      data = { success: false, message: res.statusText || 'Request failed' };
    }

    if (!res.ok && data.success !== false) {
      return { success: false, message: data.message || `Patient API returned ${res.status}` };
    }
    return data;
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Could not reach patient API.',
    };
  }
}
