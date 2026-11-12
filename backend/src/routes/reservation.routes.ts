import { Router } from 'express';
import reservationController from '../controllers/reservation.controller';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware';

const router = Router();

// All reservation routes require authentication (Guest or Admin)
router.use(authenticateToken, authorizeRoles('Guest', 'Admin'));

// POST /api/reservations - Create new booking with row-level lock (SF-6, BR-07)
router.post('/', (req, res) => reservationController.createReservation(req, res));

// GET /api/reservations/me - Get logged-in user's reservation history (SF-8)
router.get('/me', (req, res) => reservationController.getMyReservations(req, res));

// GET /api/reservations/:id - Get reservation detail by ID or bookingCode (SF-6, SF-8, BR-15)
router.get('/:id', (req, res) => reservationController.getReservationById(req, res));

export default router;
