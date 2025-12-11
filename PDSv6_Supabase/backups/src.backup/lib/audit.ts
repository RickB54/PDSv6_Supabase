import supabase from '@/lib/supabase';

export type AuditDetails = Record<string, any> | null;

export async function logAudit(action: string, details?: AuditDetails) {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const actor = userData?.user?.id || null;
    await supabase.from('audit_log').insert({
      action,
      actor_user_id: actor,
      details: details || null,
    } as any);
  } catch (e) {
    try {
      const existing = JSON.parse(localStorage.getItem('auditLog') || '[]');
      existing.push({ action, details: details || null, created_at: new Date().toISOString() });
      localStorage.setItem('auditLog', JSON.stringify(existing));
    } catch {}
  }
}

export async function logBackup(details?: AuditDetails) {
  return logAudit('backup', details);
}

export async function logRestore(details?: AuditDetails) {
  return logAudit('restore', details);
}

export async function logDelete(details?: AuditDetails) {
  return logAudit('delete', details);
}

export async function logRestoreDefaults(details?: AuditDetails) {
  return logAudit('restore_defaults', details);
}

