/**
 * The API sends order, return and review times as ISO strings; screens and
 * invoices printed them raw ("2026-07-27T11:04:58.093Z").
 */
export function formatDateTime(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return value || '';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(value) {
  const d = new Date(value);
  if (!value || Number.isNaN(d.getTime())) return value || '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
