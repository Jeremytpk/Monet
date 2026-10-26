type Translations = Record<string, string>;

export function roleLabel(role: unknown, t: Translations) {
  const r = String(role || '').toLowerCase();
  return r === 'admin' ? t.roleAdmin : r === 'mcp' ? t.roleAgent : t.roleUser;
}

const isTimestamp = (v: any) => v && typeof v.seconds === 'number' && typeof v.nanoseconds === 'number';
const tsToString = (v: any) => new Date(v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6)).toLocaleString();

function formatValue(k: string, v: any) {
  if (isTimestamp(v)) return `${k}: ${tsToString(v)}`;
  if (Array.isArray(v)) return `${k}: ${v.join(', ')}`;
  if (typeof v === 'object') return `${k}: {…}`;
  return `${k}: ${String(v)}`;
}

/** One-line summary of an activity's metadata (unwraps `updates` from edit_user entries). */
export function formatActivityMeta(meta: any): string {
  if (!meta) return '';
  if (Array.isArray(meta)) return meta.join(', ');
  if (typeof meta !== 'object') return String(meta);

  const parts: string[] = [];
  if (meta.updates && typeof meta.updates === 'object') {
    Object.entries(meta.updates).forEach(([k, v]) => {
      if (v != null) parts.push(formatValue(k, v));
    });
  }
  if (meta.amount != null) parts.push(`$${Number(meta.amount).toFixed(2)}`);
  Object.entries(meta).forEach(([k, v]) => {
    if (k === 'amount' || k === 'updates' || v == null) return;
    parts.push(formatValue(k, v));
  });
  return parts.join(' · ');
}
