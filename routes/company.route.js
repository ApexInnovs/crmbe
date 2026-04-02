const express = require('express');
const router = express.Router();
const companyController = require('../controller/company.controller');

/**
 * @swagger
 * tags:
 *   name: Company
 *   description: Company management
 */

/**
 * @swagger
 * /company:
 *   post:
 *     summary: Create a new company
 *     tags: [Company]
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
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               logo:
 *                 type: string
 *               instagram:
 *                 type: string
 *               facebook:
 *                 type: string
 *               twitter:
 *                 type: string
 *               linkedin:
 *                 type: string
 *               isVerified:
 *                 type: boolean
 *               status:
 *                 type: integer
 *               packageId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Company created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 credentialId:
 *                   type: string
 *                 packageId:
 *                   type: string
 *                 address:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 logo:
 *                   type: string
 *                 instagram:
 *                   type: string
 *                 facebook:
 *                   type: string
 *                 twitter:
 *                   type: string
 *                 linkedin:
 *                   type: string
 *                 isVerified:
 *                   type: boolean
 *                 status:
 *                   type: integer
 *                 createdAt:
 *                   type: string
 *                 updatedAt:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Duplicate company or credential
 */
router.post('/company', companyController.createCompany);

/**
 * @swagger
 * /company/login:
 *   post:
 *     summary: Company login
 *     tags: [Company]
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
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid password
 *       403:
 *         description: Credential inactive or not found
 *       404:
 *         description: Company not found
 */
router.post('/company/login', companyController.companyLogin);

/**
 * @swagger
 * /company:
 *   get:
 *     summary: Get all companies (search & pagination)
 *     tags: [Company]
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
 *         description: Search by company name or email
 *     responses:
 *       200:
 *         description: Paginated list of companies
 */
router.get('/company', companyController.getCompanies);

/**
 * @swagger
 * /company/{id}:
 *   get:
 *     summary: Get a company by ID
 *     tags: [Company]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company data
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Company not found
 *   patch:
 *     summary: Update a company by ID
 *     tags: [Company]
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
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               phone:
 *                 type: string
 *               logo:
 *                 type: string
 *               instagram:
 *                 type: string
 *               facebook:
 *                 type: string
 *               twitter:
 *                 type: string
 *               linkedin:
 *                 type: string
 *               isVerified:
 *                 type: boolean
 *               status:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Company updated
 *       400:
 *         description: Invalid input or ID
 *       404:
 *         description: Company not found
 *       409:
 *         description: Duplicate company email
 *   delete:
 *     summary: Soft delete a company by ID
 *     tags: [Company]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Company soft deleted
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Company not found
 */
router.get('/company/:id', companyController.getCompanyById);
router.patch('/company/:id', companyController.updateCompany);
router.delete('/company/:id', companyController.deleteCompany);


/**
 * @swagger
 * /company/buy-package:
 *   post:
 *     summary: Buy a package for a company (add credits)
 *     tags: [Company]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - packageId
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: Company ID
 *               packageId:
 *                 type: string
 *                 description: Package ID
 *     responses:
 *       200:
 *         description: Package purchased and credits updated.
 *       400:
 *         description: companyId and packageId are required.
 *       404:
 *         description: Company or package not found.
 */
router.post('/company/buy-package', companyController.buyPackage);

module.exports = router;
