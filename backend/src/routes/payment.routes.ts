import { Router } from 'express';
import paymentController from '../controllers/payment.controller';

const router = Router();

// POST /api/payments/webhook - Public endpoint verified by Midtrans SHA-512 signature (BR-09)
router.post('/webhook', (req, res) => paymentController.handleWebhook(req, res));

export default router;
