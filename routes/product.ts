/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     description: Fetch a paginated list of products with filtering options.
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of products per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter products by category
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search products by name
 *     responses:
 *       200:
 *         description: A list of products
 *       404:
 *         description: No products found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     description: Only admin users can create a product.
 *     tags:
 *       - Products
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [product_name, brand, size, key_ingredients, skin_type, texture, usage, imageurl, price, stock_quantity, category]
 *             properties:
 *               product_name:
 *                 type: string
 *               brand:
 *                 type: string
 *               size:
 *                 type: string
 *               key_ingredients:
 *                 type: string
 *               skin_type:
 *                 type: string
 *               texture:
 *                 type: string
 *               usage:
 *                 type: string
 *               imageurl:
 *                 type: string
 *               price:
 *                 type: number
 *               stock_quantity:
 *                 type: integer
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       403:
 *         description: Unauthorized (only admin users can create a product)
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /products/{productId}:
 *   get:
 *     summary: Get a single product
 *     description: Retrieve a product by its ID.
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the product to fetch
 *     responses:
 *       200:
 *         description: Product found
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /products/{productId}:
 *   patch:
 *     summary: Update a product
 *     description: Update an existing product's details.
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the product to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: No update fields provided
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /products/{productId}:
 *   delete:
 *     summary: Delete a product
 *     description: Remove a product from the database.
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the product to delete
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */
