const express = require('express');
const router = express.Router();
const permissionsController = require('../controller/permissions.controller');


/**
 * @swagger
 * /permissions:
 *   post:
 *     summary: Create a new permission
 *     tags: [Permissions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Permission name
 *               meta:
 *                 type: string
 *                 description: Permission meta info
 *               status:
 *                 type: integer
 *                 description: 1-active, 0-inactive
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Permission created successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Duplicate permission name
 *   get:
 *     summary: Get all permissions (with search & pagination)
 *     tags: [Permissions]
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
 *         description: Page size
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by permission name
 *     responses:
 *       200:
 *         description: Paginated list of permissions
 */
router.post('/permissions', permissionsController.createPermission);
router.get('/permissions', permissionsController.getPermissions);

/**
 * @swagger
 * /permissions/{id}:
 *   get:
 *     summary: Get a permission by ID
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission data
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Permission not found
 *   put:
 *     summary: Update a permission by ID
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Permission name
 *               meta:
 *                 type: string
 *                 description: Permission meta info
 *               status:
 *                 type: integer
 *                 description: 1-active, 0-inactive
 *     responses:
 *       200:
 *         description: Permission updated
 *       400:
 *         description: Invalid input or ID
 *       404:
 *         description: Permission not found
 *       409:
 *         description: Duplicate permission name
 *   delete:
 *     summary: Soft delete a permission by ID
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission soft deleted
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Permission not found
 */
router.get('/permissions/:id', permissionsController.getPermissionById);
router.put('/permissions/:id', permissionsController.updatePermission);
router.delete('/permissions/:id', permissionsController.deletePermission);

module.exports = router;
