const express = require("express");
const router = express.Router();
const leadController = require("../controller/lead.controller");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

/**
 * @swagger
 * tags:
 *   name: Lead
 *   description: Lead management
 */

/**
 * @swagger
 * /leads:
 *   post:
 *     summary: Create a new lead
 *     tags: [Lead]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company
 *             properties:
 *               campigne:
 *                 type: string
 *                 description: Campaign ID
 *               leadData:
 *                 type: object
 *                 description: Dynamic lead data
 *               company:
 *                 type: string
 *                 description: Company ID
 *               createdBy:
 *                 type: string
 *                 description: Employee ID
 *               status:
 *                 type: string
 *                 enum: [created, not_responsed, not_intrested, intrested_but_later, intrested, coustomer, lost]
 *                 description: Lead status
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       400:
 *         description: Validation error
 *   get:
 *     summary: Get all leads (search, pagination, filter)
 *     tags: [Lead]
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
 *         description: Search by name, email, phone, or status
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Lead status
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *         description: Company ID
 *       - in: query
 *         name: campigne
 *         schema:
 *           type: string
 *         description: Campaign ID
 *       - in: query
 *         name: contacted
 *         schema:
 *           type: string
 *           enum: [all, contacted, nocontacted]
 *           default: all
 *         description: >-
 *           Filter by contacted status:
 *           - 'contacted': status is not 'created' (contacted)
 *           - 'nocontacted': status is 'created' (not contacted)
 *           - 'all': no filter (default)
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Employee ID (assigned to)
 *     responses:
 *       200:
 *         description: List of leads
 */
router.post("/leads", leadController.createLead);
router.get("/leads", leadController.getLeads);

/**
 * @swagger
 * /leads/{id}:
 *   get:
 *     summary: Get a lead by ID
 *     tags: [Lead]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead data
 *       404:
 *         description: Lead not found
 *   patch:
 *     summary: Update a lead by ID
 *     tags: [Lead]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nextMeetingDate:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *                     addedBy:
 *                       type: string
 *                     addedAt:
 *                       type: string
 *                       format: date-time
 *               status:
 *                 type: string
 *                 enum: [created, not_responsed, not_intrested, intrested_but_later, intrested, coustomer, lost]
 *               callRecording:
 *                 type: string
 *               callRecordingText:
 *                 type: string
 *               screenshots:
 *                 type: array
 *                 items:
 *                   type: string
 *               leadData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Lead updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Lead not found
 *   delete:
 *     summary: Soft delete a lead by ID
 *     tags: [Lead]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead soft deleted
 *       404:
 *         description: Lead not found
 */
router.get("/leads/:id", leadController.getLeadById);
router.patch("/leads/:id", leadController.updateLead);
router.delete("/leads/:id", leadController.deleteLead);

/**
 * @swagger
 * /assign/equal:
 *   post:
 *     summary: Assign leads equally to active employees of a company
 *     tags: [Lead]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - leadIds
 *             properties:
 *               companyId:
 *                 type: string
 *                 description: Company ID
 *               leadIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Lead IDs
 *     responses:
 *       200:
 *         description: Leads assigned equally.
 *       400:
 *         description: Validation error or no active employees found.
 */
router.post("/assign/equal", leadController.assignLeadsEqually);

/**
 * @swagger
 * /assign/to-employee:
 *   post:
 *     summary: Assign leads to a specific employee
 *     tags: [Lead]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - employeeId
 *               - leadIds
 *             properties:
 *               employeeId:
 *                 type: string
 *                 description: Employee ID
 *               leadIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of Lead IDs
 *     responses:
 *       200:
 *         description: Leads assigned to employee.
 *       400:
 *         description: Validation error.
 */
router.post("/assign/to-employee", leadController.assignLeadsToEmployee);

/**
 * @swagger
 * /by-campaign-employee:
 *   get:
 *     summary: Get leads by campaign and employee
 *     tags: [Lead]
 *     parameters:
 *       - in: query
 *         name: campigne
 *         schema:
 *           type: string
 *         required: true
 *         description: Campaign ID
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         required: true
 *         description: Employee ID
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
 *     responses:
 *       200:
 *         description: List of leads by campaign and employee.
 *       400:
 *         description: Validation error.
 */
router.get(
  "/by-campaign-employee",
  leadController.getLeadsByCampaignAndEmployee,
);

/**
 * @swagger
 * /leads/bulk-upload:
 *   post:
 *     summary: Bulk upload leads from CSV/XLSX file
 *     tags: [Lead]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV or XLSX file containing leads
 *     responses:
 *       201:
 *         description: All leads uploaded successfully.
 *       207:
 *         description: Some leads uploaded, some failed. Returns a CSV of failed rows.
 *       400:
 *         description: No leads uploaded or validation error.
 *       500:
 *         description: Server error.
 */
router.post(
  "/leads/bulk-upload",
  upload.single("file"),
  leadController.bulkUploadLeads,
);

// Import leads from JSON (parsed on frontend)

/**
 * @swagger
 * /leads/import:
 *   post:
 *     summary: Import leads from JSON (with optional campaign creation)
 *     tags: [Lead]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leads
 *               - company
 *             properties:
 *               campaignId:
 *                 type: string
 *                 description: Existing campaign ID (optional, if not provided, a new campaign will be created)
 *               campignName:
 *                 type: string
 *                 description: Name for new campaign (required if campaignId not provided)
 *               description:
 *                 type: string
 *                 description: Description for new campaign (required if campaignId not provided)
 *               company:
 *                 type: string
 *                 description: Company ID
 *               createdBy:
 *                 type: string
 *                 description: Employee ID (creator)
 *               leads:
 *                 type: array
 *                 description: Array of lead data objects
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: All leads imported successfully.
 *       207:
 *         description: Some leads imported, some failed.
 *       400:
 *         description: Validation error or no leads imported.
 *       500:
 *         description: Server error.
 */
router.post("/leads/import", leadController.importLeads);

module.exports = router;
