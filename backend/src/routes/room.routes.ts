import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';

const router = Router();
const roomController = new RoomController();

// Public routes
router.get('/', roomController.getPublicRooms);
router.get('/:id', roomController.getPublicRoomById);

export default router;
