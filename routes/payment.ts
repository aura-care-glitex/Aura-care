/**
 * @swagger
 * /payment/paystack/pay:
 *   post:
 *     summary: Initialize a payment
 *     description: |
 *       Initiates a payment process for a user. Ensures idempotency to prevent duplicate transactions.
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 description: The amount to be paid
 *           examples:
 *             ExamplePayment:
 *               summary: Sample Payment Initialization
 *               value:
 *                 amount: 5000
 *     responses:
 *       "200":
 *         description: Payment successfully initialized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Payment initialized successfully"
 *                 url:
 *                   type: string
 *                   format: uri
 *                   example: "https://paystack.com/authorize/xyz"
 *       "400":
 *         description: Duplicate payment detected
 *       "404":
 *         description: User not found
 *       "500":
 *         description: Payment processing error
 */