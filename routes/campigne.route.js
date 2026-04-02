const express = require('express');
const router = express.Router();
const campigneController = require('../controller/campigne.controller');

/**
 * @swagger
 * tags:
 *   name: Campigne
 *   description: Campaign management
 */

/**
 * @swagger
 * /campigne:
 *   post:
 *     summary: Create a new campaign
 *     tags: [Campigne]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - company
 *               - createdBy
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               company:
 *                 type: string
 *                 description: Company ID
 *               createdBy:
 *                 type: string
 *                 description: Employee ID
 *               formStructure:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     label:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [text, email, number, date, textarea, dropdown, radio, checkbox]
 *                     isRequired:
 *                       type: boolean
 *                     prefilledValue:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                     placeholder:
 *                       type: string
 *               status:
 *                 type: integer
 *                 description: 1-active, 2-started, 3-completed, 4-cancelled
 *     responses:
 *       201:
 *         description: Campaign created
 *       400:
 *         description: Validation error
 */
router.post('/campigne', campigneController.createCampigne);

/**
 * @swagger
 * /campigne/company/{companyId}:
 *   get:
 *     summary: Get campaigns by company ID (search, pagination, filter)
 *     tags: [Campigne]
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
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
 *         description: Search by title or description
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *         description: Campaign status
 *     responses:
 *       200:
 *         description: List of campaigns
 */
router.get('/campigne/company/:companyId', campigneController.getCampignesByCompanyId);

/**
 * @swagger
 * /campigne/{id}:
 *   get:
 *     summary: Get campaign by ID
 *     tags: [Campigne]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign found
 *       404:
 *         description: Campaign not found
 */
router.get('/campigne/:id', campigneController.getCampigneById);

/**
 * @swagger
 * /campigne/{id}:
 *   patch:
 *     summary: Update campaign by ID
 *     tags: [Campigne]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               formStructure:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     label:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [text, email, number, date, textarea, dropdown, radio, checkbox]
 *                     isRequired:
 *                       type: boolean
 *                     prefilledValue:
 *                       type: string
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *                     placeholder:
 *                       type: string
 *               status:
 *                 type: integer
 *                 description: 1-active, 2-started, 3-completed, 4-cancelled
 *     responses:
 *       200:
 *         description: Campaign updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Campaign not found
 */
router.patch('/campigne/:id', campigneController.updateCampigne);

/**
 * @swagger
 * /campigne/{id}:
 *   delete:
 *     summary: Soft delete campaign by ID
 *     tags: [Campigne]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Campaign ID
 *     responses:
 *       200:
 *         description: Campaign soft deleted
 *       404:
 *         description: Campaign not found
 */
router.delete('/campigne/:id', campigneController.deleteCampigne);

module.exports = router;
