import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';

const router = Router();
const roomController = new RoomController();

// Public routes (SF-3, SF-4, SF-5)
router.get('/', roomController.getPublicRooms);
router.get('/available', roomController.getAvailableRooms);
router.get('/:id/availability', roomController.getRoomAvailability);
router.get('/:id', roomController.getPublicRoomById);

export default router;
