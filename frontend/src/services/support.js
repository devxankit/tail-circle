import { api } from './api';

/** Generic help-desk tickets — works for any authenticated role (user or vendor). */
export async function fetchMyTickets() {
  const { data } = await api.get('/support/tickets');
  return data;
}

export async function createSupportTicket(body) {
  const { data } = await api.post('/support/tickets', body);
  return data;
}

export async function replySupportTicket(id, message) {
  const { data } = await api.post(`/support/tickets/${id}/replies`, { message });
  return data;
}
