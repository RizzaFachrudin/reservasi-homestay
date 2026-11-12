import { Router } from 'express';
import reservationController from '../controllers/reservation.controller';
import paymentController from '../controllers/payment.controller';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware';

const router = Router();

// All reservation routes require authentication (Guest or Admin)
router.use(authenticateToken, authorizeRoles('Guest', 'Admin'));

// POST /api/reservations - Create new booking with row-level lock (SF-6, BR-07)
router.post('/', (req, res) => reservationController.createReservation(req, res));

// GET /api/reservations/me - Get logged-in user's reservation history (SF-8)
router.get('/me', (req, res) => reservationController.getMyReservations(req, res));

// POST /api/reservations/:id/pay - Create or reuse Midtrans Snap transaction (SF-7)
router.post('/:id/pay', (req, res) => paymentController.createOrGetPayment(req, res));

// POST /api/reservations/:id/sync - Sync payment status from Midtrans API (SF-7)
router.post('/:id/sync', (req, res) => paymentController.syncPaymentStatus(req, res));

// POST /api/reservations/:id/cancel - Manually cancel a Pending reservation
router.post('/:id/cancel', (req, res) => reservationController.cancelReservation(req, res));

// GET /api/reservations/:id/invoice - Download PDF invoice (SF-9, BR-15)
router.get('/:id/invoice', (req, res) => reservationController.downloadInvoice(req, res));

// GET /api/reservations/:id - Get reservation detail by ID or bookingCode (SF-6, SF-8, BR-15)
router.get('/:id', (req, res) => reservationController.getReservationById(req, res));

export default router;
