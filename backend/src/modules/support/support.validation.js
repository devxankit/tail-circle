import { z } from 'zod';
import { TICKET_CATEGORIES } from './supportTicket.model.js';

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  category: z.enum(TICKET_CATEGORIES).default('other'),
  message: z.string().trim().min(10).max(2000),
});

export const replyTicketSchema = z.object({
  message: z.string().trim().min(1).max(2000),
});
