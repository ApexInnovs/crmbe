const express = require("express");
const router = express.Router();
const adminController = require("../controller/admin.controller");
const permission = require("../middleware/permission.middleware");

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management
 */

/**
 * @swagger
 * /admin:
 *   post:
 *     summary: Create a new admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin created
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate admin or credential
 */
router.post("/admin",
  //  permission("create_admin"),
    adminController.createAdmin);

/**
 * @swagger
 * /admin:
 *   get:
 *     summary: Get all admins (paginated, searchable)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: List of admins
 */
router.get("/admin",
  //  permission("view_admin"),
    adminController.getAllAdmins);

/**
 * @swagger
 * /admin/{id}:
 *   get:
 *     summary: Get admin by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin ID
 *     responses:
 *       200:
 *         description: Admin found
 *       404:
 *         description: Admin not found
 */
router.get(
  "/admin/:id",
  // permission("view_admin"),
  adminController.getAdminById,
);

/**
 * @swagger
 * /admin/{id}:
 *   patch:
 *     summary: Update admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *               status:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Admin updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Admin not found
 */
router.patch(
  "/admin/:id",
  // permission("update_admin"),
  adminController.updateAdmin,
);

/**
 * @swagger
 * /admin/{id}:
 *   delete:
 *     summary: Soft delete admin
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin ID
 *     responses:
 *       200:
 *         description: Admin soft deleted
 *       404:
 *         description: Admin not found
 */
router.delete(
  "/admin/:id",
  // permission("delete_admin"),
  adminController.deleteAdmin,
);

/**
 * @swagger
 * /admin/{id}/password:
 *   patch:
 *     summary: Update admin password
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Admin ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Admin not found
 */
router.patch(
  "/admin/:id/password",
  // permission("update_admin"),
  adminController.updateAdminPassword,
);

/**
 * @swagger
 * /admin/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
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
 *                 description: Admin's email
 *               password:
 *                 type: string
 *                 description: Admin's password
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid email or password
 */
router.post("/admin/login", adminController.login);

module.exports = router;
