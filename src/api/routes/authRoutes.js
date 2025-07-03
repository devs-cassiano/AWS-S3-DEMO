const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     TokenValidationResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         data:
 *           type: object
 *           properties:
 *             userId:
 *               type: string
 *               description: User ID from external IAM service
 *             email:
 *               type: string
 *               format: email
 *               description: User email
 *             role:
 *               type: string
 *               enum: [admin, user]
 *               description: User role
 *             permissions:
 *               type: array
 *               items:
 *                 type: string
 *               description: List of user permissions
 *             iat:
 *               type: number
 *               description: Token issued at timestamp
 *             exp:
 *               type: number
 *               description: Token expiration timestamp
 */

/**
 * @swagger
 * /auth/validate:
 *   get:
 *     summary: Validate JWT token from external IAM service
 *     description: Validates the JWT token provided in the Authorization header and returns user information if valid. This endpoint is used to verify tokens issued by the external IAM microservice.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid and user information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TokenValidationResponse'
 *             example:
 *               status: success
 *               data:
 *                 userId: "user-123"
 *                 email: "user@example.com"
 *                 role: "user"
 *                 permissions: ["read:buckets", "write:objects"]
 *                 iat: 1625097600
 *                 exp: 1625184000
 *       401:
 *         description: Invalid, expired, or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalid_token:
 *                 summary: Invalid token
 *                 value:
 *                   error: "Invalid token"
 *                   code: "INVALID_TOKEN"
 *               expired_token:
 *                 summary: Expired token
 *                 value:
 *                   error: "Token has expired"
 *                   code: "TOKEN_EXPIRED"
 *               missing_token:
 *                 summary: Missing token
 *                 value:
 *                   error: "Authorization token required"
 *                   code: "TOKEN_REQUIRED"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/validate', authenticate, authController.validateToken);

/**
 * @swagger
 * /auth/user:
 *   get:
 *     summary: Get current authenticated user information
 *     description: Returns detailed information about the currently authenticated user from the external IAM service. This endpoint fetches the most up-to-date user data including profile information, roles, and permissions.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         profile:
 *                           type: object
 *                           properties:
 *                             firstName:
 *                               type: string
 *                               example: "John"
 *                             lastName:
 *                               type: string
 *                               example: "Doe"
 *                             avatar:
 *                               type: string
 *                               format: uri
 *                               example: "https://example.com/avatar.jpg"
 *                             lastLogin:
 *                               type: string
 *                               format: date-time
 *                               example: "2025-07-02T10:30:00Z"
 *                         settings:
 *                           type: object
 *                           properties:
 *                             timezone:
 *                               type: string
 *                               example: "America/New_York"
 *                             language:
 *                               type: string
 *                               example: "en-US"
 *                             notifications:
 *                               type: boolean
 *                               example: true
 *             example:
 *               status: success
 *               data:
 *                 id: "user-123"
 *                 email: "user@example.com"
 *                 role: "user"
 *                 permissions: ["read:buckets", "write:objects", "delete:objects"]
 *                 profile:
 *                   firstName: "John"
 *                   lastName: "Doe"
 *                   avatar: "https://example.com/avatar.jpg"
 *                   lastLogin: "2025-07-02T10:30:00Z"
 *                 settings:
 *                   timezone: "America/New_York"
 *                   language: "en-US"
 *                   notifications: true
 *       401:
 *         description: Unauthorized - Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "Authentication required"
 *               code: "UNAUTHORIZED"
 *       403:
 *         description: Forbidden - User account disabled or suspended
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "User account is suspended"
 *               code: "USER_SUSPENDED"
 *       404:
 *         description: User not found in IAM service
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "User not found"
 *               code: "USER_NOT_FOUND"
 *       500:
 *         description: Internal server error or IAM service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/user', authenticate, authController.getCurrentUser);

/**
 * @swagger
 * /auth/permissions:
 *   get:
 *     summary: Get user permissions and policies
 *     description: Returns detailed permissions and IAM policies for the current user. This includes both direct permissions and inherited permissions from roles and groups.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: Filter permissions for a specific resource type (bucket, object, etc.)
 *         example: bucket
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter permissions for a specific action
 *         example: read
 *     responses:
 *       200:
 *         description: User permissions retrieved successfully
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
 *                     userId:
 *                       type: string
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           action:
 *                             type: string
 *                           resource:
 *                             type: string
 *                           effect:
 *                             type: string
 *                             enum: [Allow, Deny]
 *                           conditions:
 *                             type: object
 *                     policies:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           version:
 *                             type: string
 *                           statements:
 *                             type: array
 *                             items:
 *                               type: object
 *             example:
 *               status: success
 *               data:
 *                 userId: "user-123"
 *                 permissions:
 *                   - action: "read"
 *                     resource: "bucket"
 *                     effect: "Allow"
 *                     conditions: {}
 *                   - action: "write"
 *                     resource: "object"
 *                     effect: "Allow"
 *                     conditions:
 *                       bucket: ["my-bucket"]
 *                 policies:
 *                   - id: "policy-1"
 *                     name: "S3ReadOnlyAccess"
 *                     version: "2012-10-17"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/permissions', authenticate, authController.getUserPermissions);

module.exports = router;
