const express = require('express');
const router = express.Router();
const roleController = require('../controller/role.controller');


/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Role name
 *               type:
 *                 type: string
 *                 enum: [admin, company]
 *                 description: Role type (admin or company)
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Permission IDs
 *               status:
 *                 type: integer
 *                 description: 1-active, 0-inactive
 *             required:
 *               - name
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Duplicate role name
 *   get:
 *     summary: Get all roles (with search & pagination)
 *     tags: [Roles]
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
 *         description: Search by role name
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [admin, company]
 *         description: Filter by role type (admin or company)
 *     responses:
 *       200:
 *         description: Paginated list of roles
 */
router.post('/roles', roleController.createRole);
router.get('/roles', roleController.getRoles);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Get a role by ID
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role data
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Role not found
 *   put:
 *     summary: Update a role by ID
 *     tags: [Roles]
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
 *                 description: Role name
 *               type:
 *                 type: string
 *                 enum: [admin, company]
 *                 description: Role type (admin or company)
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Permission IDs
 *               status:
 *                 type: integer
 *                 description: 1-active, 0-inactive
 *     responses:
 *       200:
 *         description: Role updated
 *       400:
 *         description: Invalid input or ID
 *       404:
 *         description: Role not found
 *       409:
 *         description: Duplicate role name
 *   delete:
 *     summary: Soft delete a role by ID
 *     tags: [Roles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role soft deleted
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Role not found
 */
router.get('/roles/:id', roleController.getRoleById);
router.put('/roles/:id', roleController.updateRole);
router.delete('/roles/:id', roleController.deleteRole);

module.exports = router;
