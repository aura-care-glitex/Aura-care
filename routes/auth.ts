import { createUser, forgotpassword, loginUser, protect, resetPassword, updatingPassword } from "../controllers/AuthController";
import { ActivateUser, getAllUsers, getSingleUser, softDelete } from "../controllers/userController";
import router from "./userRoute";

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return JWT token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 token:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "64c8f96d5f2f2a001c6d7b9a"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     email:
 *                       type: string
 *                       example: "johndoe@example.com"
 *                     role:
 *                       type: string
 *                       example: "admin"
 *       401:
 *         description: Unauthorized - Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post("/login", loginUser);

/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     description: |
 *       Register a new user. The 'role' field is optional and defaults to 'user'.
 *       Delivery_location is also optional
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - username
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               username:
 *                 type: string
 *                 example: johndoe
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *                 example: user
 *               delivery_location:
 *                 type: string
 *                 example: "Nairobi, Kenya"
 *               address:
 *                 type: string
 *                 example: "123 Main Street"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *                     delivery_location:
 *                       type: string
 *                     address:
 *                       type: string
 *       400:
 *         description: Bad request - Missing required fields
 *       500:
 *         description: Internal server error
 */
router.post("/register", createUser);

/**
 * @swagger
 * /users/forgotPassword:
 *   post:
 *     summary: Request a password reset
 *     description: |
 *       Allows a user to request a password reset by providing their email.
 *       If the email exists, an OTP token is sent to their email for verification.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Reset password email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Reset password email sent
 *       401:
 *         description: Unauthorized - Email not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: User not found
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Internal server error
 */
router.post("/forgotpassword", forgotpassword);

/**
 * @swagger
 * /users/resetPassword/{token}:
 *   post:
 *     summary: Reset user password
 *     description: |
 *       Allows a user to reset their password using a valid reset token.
 *       The new password must be confirmed before submission.
 *     tags:
 *       - Authentication
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: integer
 *         description: The password reset token sent to the user's email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - confirmPassword
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 example: newSecurePassword123
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: newSecurePassword123
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Password updated successfully
 *       400:
 *         description: Token is required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: Token is required
 *       402:
 *         description: Passwords do not match or token has expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: Passwords do not match OR Token has expired
 *       404:
 *         description: Invalid token or token expired
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: Invalid token or token expired
 *       500:
 *         description: Internal server error
 */
router.post("/resetpassword/:token", resetPassword);

/**
 * @swagger
 * /users/updatePassword:
 *   patch:
 *     summary: Update user password
 *     description: |
 *       Allows an authenticated user to update their password.
 *       The user must provide the current password and the new password.
 *     tags:
 *       - Authentication
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - password
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: oldSecurePassword123
 *               password:
 *                 type: string
 *                 format: password
 *                 example: newSecurePassword456
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Password updated successfully
 *       401:
 *         description: Current password is incorrect
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: Current password is incorrect
 *       403:
 *         description: Missing password fields or user does not exist
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: Your initial password and currentPassword are required OR User does not exist
 *       500:
 *         description: Internal server error
 */
router.put("/update-password", protect, updatingPassword);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Paginated)
 *     description: |
 *       Retrieves a paginated list of users (first 10 users by default).
 *       This endpoint implements **Redis caching** to improve performance.
 *     tags:
 *       - Users
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination (default is 1)
 *     responses:
 *       200:
 *         description: Successfully retrieved users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       username:
 *                         type: string
 *                         example: johndoe
 *                       email:
 *                         type: string
 *                         format: email
 *                         example: johndoe@example.com
 *       400:
 *         description: No users found or error retrieving users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: No users found
 *       500:
 *         description: Internal server error
 */
router.get("/users", protect, getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get the authenticated user's details
 *     description: |
 *       Retrieves the currently authenticated user's details from the database.
 *       This endpoint **implements Redis caching** for performance.
 *     tags:
 *       - Users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     username:
 *                       type: string
 *                       example: johndoe
 *                     email:
 *                       type: string
 *                       format: email
 *                       example: johndoe@example.com
 *       400:
 *         description: User does not exist or error retrieving user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: User does not exist
 *       500:
 *         description: Internal server error
 */
router.get("/users/:id", protect, getSingleUser);

/**
 * @swagger
 * /users/softDelete:
 *   patch:
 *     summary: Soft delete (deactivate) the authenticated user
 *     description: |
 *       Deactivates the currently authenticated user's account by setting `active: false`.
 *       The user remains in the database but is marked as inactive.
 *     tags:
 *       - Users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully deactivated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: User deactivated successfully
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: User not found
 *       400:
 *         description: Error deactivating user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: Error deactivating user
 *       500:
 *         description: Internal server error
 */
router.patch("/users/softDelete", protect, softDelete);

/**
 * @swagger
 * /users/{userId}:
 *   patch:
 *     summary: Activate a deactivated user (Admin only)
 *     description: |
 *       Allows an **admin** to reactivate a user's account by setting `active: true`.
 *     tags:
 *       - Users
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to activate
 *     responses:
 *       200:
 *         description: Successfully activated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: User activated successfully
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: User not found
 *       400:
 *         description: Error activating user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: Error activating user
 *       500:
 *         description: Internal server error
 */
router.patch("/users/:userId", protect, ActivateUser);

/**
 * @swagger
 * /users/google:
 *   get:
 *     summary: Authenticate using Google OAuth
 *     description: |
 *       Redirects the user to Google's authentication page. Upon successful authentication, Google will redirect back to the specified redirect URI.
 *     tags:
 *       - Authentication
 *     responses:
 *       302:
 *         description: Redirects the user to Google's OAuth login page.
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: https://accounts.google.com/o/oauth2/auth
 *       500:
 *         description: Internal server error (OAuth authentication failed)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Google authentication failed
 */

/**
 * @swagger
 * /users/auth/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     description: |
 *       After successful authentication, Google redirects to this endpoint. The server retrieves the user session and stores user details in the database.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: OAuth login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OAuth login successful
 *                 access_token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *       400:
 *         description: OAuth session retrieval failed
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logs out a user
 *     description: |
 *       Logs out the user based on the authentication method they used.
 *       
 *       - **Supabase Authentication**: The backend will call Supabase's `signOut` method to log the user out.
 *       - **JWT Authentication**: Since JWTs are stateless, the frontend is responsible for removing the token from local storage, session storage, or cookies.
 *       
 *       **Important Notes:**
 *       - Users authenticated via Supabase Auth will be logged out on both frontend and backend.
 *       - Users authenticated via JWT must have their tokens cleared on the frontend.
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       500:
 *         description: Server error during logout
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: Server error
 */

/**
 * @swagger
 * /users/profile:
 *   patch:
 *     summary: Update user profile
 *     description: Allows authenticated users to update their profile details such as name, address, email, and phone number.
 *     tags:
 *       - Users
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: John
 *               last_name:
 *                 type: string
 *                 example: Doe
 *               address:
 *                 type: string
 *                 example: "123 Main St, Springfield"
 *               email:
 *                 type: string
 *                 example: johndoe@example.com
 *               phonenumber:
 *                 type: string
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: User profile updated successfully
 *       400:
 *         description: No valid fields provided for update
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: No valid fields provided for update
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: User does not exist
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */