import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.middleware';
import { FacilityController } from '../controllers/facility.controller';
import { RoomController } from '../controllers/room.controller';
import reservationController from '../controllers/reservation.controller';
import upload from '../config/multer.config';

const router = Router();
const facilityController = new FacilityController();
const roomController = new RoomController();

// Protect all admin routes with authentication and Admin role check
router.use(authenticateToken, authorizeRoles('Admin'));

// Facility CRUD (SF-13)
router.get('/facilities', facilityController.getAll);
router.get('/facilities/:id', facilityController.getById);
router.post('/facilities', facilityController.create);
router.put('/facilities/:id', facilityController.update);
router.delete('/facilities/:id', facilityController.delete);

// Room CRUD (SF-12)
router.get('/rooms', roomController.getAdminRooms);
router.get('/rooms/:id', roomController.getAdminRoomById);
router.post('/rooms', roomController.create);
router.put('/rooms/:id', roomController.update);
router.delete('/rooms/:id', roomController.delete);

// Room Units per type (multi-unit stock)
router.post('/rooms/:id/units', roomController.addUnit);
router.patch('/rooms/:id/units/:unitId', roomController.updateUnit);
router.delete('/rooms/:id/units/:unitId', roomController.deleteUnit);

// Room Gallery Images (SF-14)
router.post('/rooms/:id/images', upload.array('images', 10), roomController.uploadImages);
router.patch('/images/:id/primary', roomController.setPrimaryImage);
router.delete('/images/:id', roomController.deleteImage);

// Admin Reservation Monitoring & Check-in / Check-out (SF-15, SF-16, BR-10, BR-11)
router.get('/reservations', (req, res) => reservationController.getAdminReservations(req, res));
router.get('/reservations/:id', (req, res) => reservationController.getAdminReservationById(req, res));
router.get('/checkin/lookup', (req, res) => reservationController.lookupCheckIn(req, res));
router.post('/reservations/:id/check-in', (req, res) => reservationController.checkInReservation(req, res));
router.post('/reservations/:id/check-out', (req, res) => reservationController.checkOutReservation(req, res));

export default router;
