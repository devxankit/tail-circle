import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createTicketSchema, replyTicketSchema } from './support.validation.js';
import { createTicket, listTickets, getTicket, replyTicket } from './support.controller.js';

const router = Router();

router.use(authenticate);

router.get('/tickets', listTickets);
router.post('/tickets', validate(createTicketSchema), createTicket);
router.get('/tickets/:id', getTicket);
router.post('/tickets/:id/replies', validate(replyTicketSchema), replyTicket);

export default router;
