const express = require('express');
const router = express.Router();
const dashboardController = require('../controller/companyDashboard');

/**
 * @swagger
 * /dashboard/company:
 *   get:
 *     summary: Get company dashboard analytics
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *       - in: query
 *         name: startDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         required: false
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Dashboard analytics data
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.get('/company', dashboardController.getCompanyDashboard);

module.exports = router;
