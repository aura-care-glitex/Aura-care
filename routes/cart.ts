/**
 * @swagger
 * /api/v1/cart:
 *   get:
 *     summary: Retrieve all cart items
 *     description: Fetches all cart items for the authenticated user, using Redis caching for optimization.
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved cart items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/CartItem"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */

/**
 * @swagger
 * /api/v1/cart/addCart:
 *   post:
 *     summary: Add a product to the cart
 *     description: |
 *       This endpoint allows an authenticated user to add a product to their shopping cart.  
 *       
 *       **Middleware Execution Flow:**
 *       1. **Authentication Middleware (`protect`)**:  
 *          - Extracts the token from the request headers.  
 *          - Decodes the token to retrieve `userId`.  
 *       2. **Request Validation:**  
 *          - Ensures `userId` and `productId` are provided in the request body.  
 *       3. **Check Existing Cart Item:**  
 *          - Queries the database (`cart` table) to check if the product is already in the cart for the user.  
 *       4. **Update or Insert Logic:**  
 *          - If the product exists, the quantity is updated.  
 *          - If the product does not exist, a new entry is added to the cart.  
 *       5. **Error Handling:**  
 *          - Database errors and validation errors return appropriate responses.  
 *          - Any unexpected errors are caught and handled gracefully.  
 *       
 *       **Notes:**  
 *       - Uses Supabase for database operations.  
 *       - Middleware functions `protect` and `authHeaders` ensure security.  
 *       
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: The ID of the product to add to the cart
 *               quantity:
 *                 type: integer
 *                 description: Number of items to add (defaults to 1)
 *                 example: 2
 *     responses:
 *       200:
 *         description: Product added to cart successfully
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
 *                   example: "Product added to cart successfully"
 *       400:
 *         description: Bad request (missing userId or productId)
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       500:
 *         description: Internal Server Error (database issues or unexpected errors)
 */

/**
 * @swagger
 * /api/v1/cart/decrement:
 *   patch:
 *     summary: Decrease product quantity in cart
 *     description: |
 *       This endpoint decreases the quantity of a product in the user's cart.  
 *       
 *       **Middleware Execution Flow:**
 *       1. **Authentication Middleware (`protect`)**:  
 *          - Extracts the token from the request headers.  
 *          - Decodes the token to retrieve `userId`.  
 *       2. **Request Validation:**  
 *          - Ensures `userId` and `productId` are provided in the request body.  
 *       3. **Retrieve Cart Item:**  
 *          - Fetches the product from the `cart` table based on `userId` and `productId`.  
 *       4. **Update or Remove Logic:**  
 *          - If quantity is greater than `1`, the quantity is decreased.  
 *          - If quantity is `1`, the product is removed from the cart.  
 *       5. **Error Handling:**  
 *          - Returns appropriate errors for missing products, database issues, or authentication failures.  
 *       
 *       **Notes:**  
 *       - Uses Supabase for database operations.  
 *       - Middleware functions `protect` and `authHeaders` ensure security.  
 *       
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: The ID of the product to decrease in quantity
 *     responses:
 *       200:
 *         description: Quantity decreased or item removed
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
 *                   example: "Quantity decreased successfully"
 *                 quantity:
 *                   type: integer
 *                   example: 2
 *       404:
 *         description: Product not found in cart
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       500:
 *         description: Internal Server Error (database issues or unexpected errors)
 */

/**
 * @swagger
 * /api/v1/cart/deleteCart:
 *   delete:
 *     summary: Remove a product from the cart
 *     description: |
 *       This endpoint completely removes a product from the user's cart.  
 *       
 *       **Middleware Execution Flow:**
 *       1. **Authentication Middleware (`protect`)**:  
 *          - Extracts the token from the request headers.  
 *          - Decodes the token to retrieve `userId`.  
 *       2. **Request Validation:**  
 *          - Ensures `userId` and `productId` are provided in the request body.  
 *       3. **Delete Cart Item:**  
 *          - The product is removed from the `cart` table if it exists.  
 *       4. **Error Handling:**  
 *          - Returns appropriate errors for missing products, database issues, or authentication failures.  
 *       
 *       **Notes:**  
 *       - Uses Supabase for database operations.  
 *       - Middleware functions `protect` and `authHeaders` ensure security.  
 *       
 *     tags: [Cart]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 description: The ID of the product to be removed from the cart
 *     responses:
 *       200:
 *         description: Product removed from the cart
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
 *                   example: "Product removed from cart successfully"
 *       404:
 *         description: Product not found in cart
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *       500:
 *         description: Internal Server Error (database issues or unexpected errors)
 */