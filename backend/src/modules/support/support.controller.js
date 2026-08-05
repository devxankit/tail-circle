import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendSuccess } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { SupportTicket } from './supportTicket.model.js';

/** POST /support/tickets */
export const createTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.create({ ...req.body, userId: req.user.id });
  sendSuccess(res, { statusCode: 201, message: 'Ticket created', data: ticket });
});

/** GET /support/tickets — my tickets, newest first. */
export const listTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({ userId: req.user.id }).sort({ updatedAt: -1 });
  sendSuccess(res, { data: tickets });
});

/** GET /support/tickets/:id */
export const getTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user.id });
  if (!ticket) throw ApiError.notFound('Ticket not found');
  sendSuccess(res, { data: ticket });
});

/** POST /support/tickets/:id/replies — user follow-up on own ticket. */
export const replyTicket = asyncHandler(async (req, res) => {
  const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user.id });
  if (!ticket) throw ApiError.notFound('Ticket not found');
  if (['resolved', 'closed'].includes(ticket.status)) {
    throw ApiError.badRequest('This ticket is closed — open a new one if you still need help');
  }
  ticket.replies.push({ by: 'user', authorId: req.user.id, message: req.body.message });
  await ticket.save();
  sendSuccess(res, { message: 'Reply added', data: ticket });
});
