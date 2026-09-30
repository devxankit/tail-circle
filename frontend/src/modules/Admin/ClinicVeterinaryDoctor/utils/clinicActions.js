/**
 * Small helpers the clinic screens share: phone links for calling or
 * messaging an owner, a print window for records and prescriptions (the
 * browser's print dialog saves them as PDF), and matching a pet to its
 * patient record.
 */

const digits = (phone) => String(phone || '').replace(/[^\d+]/g, '');

export const hasPhone = (phone) => digits(phone).replace(/\D/g, '').length >= 6;

/** Open the phone dialler. */
export function callPhone(phone) {
  if (!hasPhone(phone)) return false;
  window.location.href = `tel:${digits(phone)}`;
  return true;
}

/** Open the SMS app with an optional prefilled message. */
export function textPhone(phone, body = '') {
  if (!hasPhone(phone)) return false;
  window.location.href = `sms:${digits(phone)}${body ? `?body=${encodeURIComponent(body)}` : ''}`;
  return true;
}

/** Open WhatsApp with a prefilled message (Indian numbers without a country code get +91). */
export function whatsappPhone(phone, body = '') {
  if (!hasPhone(phone)) return false;
  let n = digits(phone).replace(/^\+/, '');
  if (n.length === 10) n = `91${n}`;
  window.open(`https://wa.me/${n}${body ? `?text=${encodeURIComponent(body)}` : ''}`, '_blank', 'noopener');
  return true;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Print a simple document: `rows` are [label, value] pairs, `sections` are
 * { title, body } blocks (body may be text or an HTML table built here).
 * Returns false when the browser blocked the window.
 */
export function printDocument({ title, subtitle, rows = [], sections = [] }) {
  const win = window.open('', '_blank');
  if (!win) return false;
  const rowHtml = rows
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
    .join('');
  const sectionHtml = sections
    .filter((s) => s && (s.body || s.html))
    .map((s) => `<h2>${esc(s.title)}</h2>${s.html || `<p>${esc(s.body).replace(/\n/g, '<br/>')}</p>`}`)
    .join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #111; margin: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; } .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: #444; margin: 22px 0 8px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  th { width: 34%; color: #555; font-weight: 600; } p { font-size: 13px; line-height: 1.55; }
  .foot { margin-top: 32px; font-size: 11px; color: #888; }
</style></head><body>
<h1>${esc(title)}</h1>${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ''}
${rowHtml ? `<table>${rowHtml}</table>` : ''}${sectionHtml}
<div class="foot">Generated from TailCircle on ${esc(new Date().toLocaleString())}</div>
<script>window.onload = function () { window.print(); };</script>
</body></html>`);
  win.document.close();
  return true;
}

/** An HTML table of medicine rows for printDocument's `sections[].html`. */
export function medicinesTable(items = []) {
  const rows = items.filter((m) => m && m.name);
  if (!rows.length) return '';
  return `<table><tr><th>Medicine</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr>${rows
    .map((m) => `<tr><td>${esc(m.name)}</td><td>${esc(m.dosage)}</td><td>${esc(m.frequency)}</td><td>${esc(m.duration)}</td></tr>`)
    .join('')}</table>`;
}

const norm = (s) => String(s || '').trim().toLowerCase();

/** The patient record for a pet (by name, and owner when given). */
export function findPatient(patients = [], petName, owner) {
  const byName = patients.filter((p) => norm(p.name) === norm(petName));
  if (!owner) return byName[0] || null;
  return byName.find((p) => norm(p.owner) === norm(owner)) || byName[0] || null;
}

/** Does a row (record, prescription, vaccination…) belong to this pet? */
export const isSamePet = (row, patient, nameKey = 'petName') =>
  norm(row?.[nameKey]) === norm(patient?.name) && (!row?.owner || !patient?.owner || norm(row.owner) === norm(patient.owner));
