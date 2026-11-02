import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));

// Protected routes
router.get('/me', authenticateToken, (req, res) => authController.getProfile(req, res));
router.post('/logout', authenticateToken, (req, res) => authController.logout(req, res));

export default router;
