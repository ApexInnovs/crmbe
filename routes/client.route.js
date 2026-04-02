const express = require('express');
const router = express.Router();
const clientController = require('../controller/client.controller');

/**
 * @swagger
 * tags:
 *   name: Client
 *   description: Client management
 */

/**
 * @swagger
 * /clients:
 *   post:
 *     summary: Create a new client
 *     tags: [Client]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - lead_id
 *               - company
 *             properties:
 *               lead_id:
 *                 type: string
 *                 description: Lead ID
 *               company:
 *                 type: string
 *                 description: Company ID
 *               managedBy:
 *                 type: string
 *                 description: Manager name or ID
 *               projects:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     deadline:
 *                       type: string
 *                       format: date
 *                     budget:
 *                       type: number
 *                     status:
 *                       type: string
 *                       enum: [Not Started, In Progress, On Hold, Completed, Cancelled]
 *               notes:
 *                 type: string
 *               status:
 *                 type: integer
 *                 description: 1-active, 0-inactive
 *     responses:
 *       201:
 *         description: Client created
 *       400:
 *         description: Validation error
 *   get:
 *     summary: Get all clients (search, pagination, filter)
 *     tags: [Client]
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
 *         description: Search by notes, project name, document title
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *         description: Client status
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *         description: Company ID
 *       - in: query
 *         name: managedBy
 *         schema:
 *           type: string
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: List of clients
 */
router.post('/clients', clientController.createClient);
router.get('/clients', clientController.getClients);

/**
 * @swagger
 * /clients/{id}:
 *   get:
 *     summary: Get client by ID
 *     tags: [Client]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client data
 *       404:
 *         description: Client not found
 *   patch:
 *     summary: Update client by ID
 *     tags: [Client]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projects:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     startDate:
 *                       type: string
 *                       format: date
 *                     deadline:
 *                       type: string
 *                       format: date
 *                     budget:
 *                       type: number
 *                     status:
 *                       type: string
 *                       enum: [Not Started, In Progress, On Hold, Completed, Cancelled]
 *               notes:
 *                 type: string
 *               status:
 *                 type: integer
 *                 description: 1-active, 0-inactive
 *               managedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Client updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Client not found
 *   delete:
 *     summary: Soft delete client by ID
 *     tags: [Client]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client soft deleted
 *       404:
 *         description: Client not found
 */

router.get('/clients/:id', clientController.getClientById);
router.patch('/clients/:id', clientController.updateClient);
router.delete('/clients/:id', clientController.deleteClient);

module.exports = router;
