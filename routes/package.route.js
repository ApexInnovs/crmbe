const express = require('express');
const router = express.Router();
const packageController = require('../controller/package.controller');


/**
 * @swagger
 * /packages:
 *   post:
 *     summary: Create a new package
 *     tags: [Packages]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Package name
 *               price:
 *                 type: number
 *                 description: Package price
 *               offering:
 *                 type: array
 *                 description: Array of features and their enabled status
 *                 items:
 *                   type: object
 *                   properties:
 *                     feature:
 *                       type: string
 *                       description: Feature name
 *                     enabled:
 *                       type: boolean
 *                       description: Is feature enabled?
 *               totalCredits:
 *                 type: number
 *                 description: Total credits included in the package
 *               status:
 *                 type: integer
 *                 description: 1-active, 0-inactive
 *             required:
 *               - name
 *               - price
 *               - offering
 *               - totalCredits
 *     responses:
 *       201:
 *         description: Package created successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Duplicate package name
 *   get:
 *     summary: Get all packages (with search & pagination)
 *     tags: [Packages]
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
 *         description: Search by package name
 *     responses:
 *       200:
 *         description: Paginated list of packages
 */
router.post('/packages', packageController.createPackage);
router.get('/packages', packageController.getPackages);

/**
 * @swagger
 * /packages/{id}:
 *   get:
 *     summary: Get a package by ID
 *     tags: [Packages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Package data
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Package not found
 *   put:
 *     summary: Update a package by ID
 *     tags: [Packages]
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
 *                 description: Package name
 *               price:
 *                 type: number
 *                 description: Package price
 *               offering:
 *                 type: array
 *                 description: Array of features and their enabled status
 *                 items:
 *                   type: object
 *                   properties:
 *                     feature:
 *                       type: string
 *                       description: Feature name
 *                     enabled:
 *                       type: boolean
 *                       description: Is feature enabled?
 *               totalCredits:
 *                 type: number
 *                 description: Total credits included in the package
 *               status:
 *                 type: integer
 *                 description: 1-active, 0-inactive
 *     responses:
 *       200:
 *         description: Package updated
 *       400:
 *         description: Invalid input or ID
 *       404:
 *         description: Package not found
 *       409:
 *         description: Duplicate package name
 *   delete:
 *     summary: Soft delete a package by ID
 *     tags: [Packages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Package soft deleted
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Package not found
 */
router.get('/packages/:id', packageController.getPackageById);
router.put('/packages/:id', packageController.updatePackage);
router.delete('/packages/:id', packageController.deletePackage);

module.exports = router;
