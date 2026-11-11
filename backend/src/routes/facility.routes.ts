import { Router } from 'express';
import { FacilityController } from '../controllers/facility.controller';

const router = Router();
const facilityController = new FacilityController();

// Public route: GET /api/facilities
router.get('/', facilityController.getAll);

export default router;
