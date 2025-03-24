/**
 * @swagger
 * /order:
 *   post:
 *     summary: Place an order
 *     description: |
 *       Creates an order based on the user's cart and selected delivery type.
 *       - **PSV** requires `stageId`.
 *       - **Outside Nairobi** requires `county` & `deliveryLocation`.
 *       - **Express Delivery** requires `storeAddress` & `deliveryLocation`.
 *       - **Self Pickup** requires only `deliveryType`.
 *     tags:
 *       - Orders
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryType:
 *                 type: string
 *                 enum: [PSV, Outside Nairobi, Express Delivery, Self Pickup]
 *               stageId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               county:
 *                 type: string
 *                 nullable: true
 *               storeAddress:
 *                 type: string
 *                 nullable: true
 *               deliveryLocation:
 *                 type: string
 *                 nullable: true
 *           examples:
 *             PSV:
 *               summary: PSV Delivery Example
 *               value:
 *                 deliveryType: "PSV"
 *                 stageId: "550e8400-e29b-41d4-a716-446655440000"
 *             OutsideNairobi:
 *               summary: Outside Nairobi Delivery Example
 *               value:
 *                 deliveryType: "Outside Nairobi"
 *                 county: "Mombasa"
 *                 deliveryLocation: "Nyali, Mombasa"
 *             ExpressDelivery:
 *               summary: Express Delivery Example
 *               value:
 *                 deliveryType: "Express Delivery"
 *                 storeAddress: "Kilimani, Nairobi"
 *                 deliveryLocation: "Westlands, Nairobi"
 *             SelfPickup:
 *               summary: Self Pickup Example
 *               value:
 *                 deliveryType: "Self Pickup"
 *     responses:
 *       "201":
 *         description: Order successfully placed
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
 *                   example: "Order placed successfully"
 *                 order_id:
 *                   type: string
 *                   format: uuid
 *                 total_price:
 *                   type: number
 *                   format: float
 *                   example: 4500.00
 *                 delivery_fee:
 *                   type: number
 *                   format: float
 *                   example: 200.00
 *       "400":
 *         description: Bad request (e.g., missing required fields)
 *       "500":
 *         description: Internal server error
 */
