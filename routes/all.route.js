const express = require('express');
const router = express.Router();


const companyRoutes = require('./company.route');
const permissionsRoutes = require('./permissions.route');

const roleRoutes = require('./role.route');

const packageRoutes = require('./package.route');

const employeeRoutes = require('./employee.route');

const leadRoutes = require('./lead.route');
const adminRoutes = require('./admin.route');
const campigneRoutes = require('./campigne.route');
 const clientRoutes = require('./client.route');

const uploadsRoutes = require('./uploads.route');
const dashboardRoutes = require('./dashboard.route');
const twiloRoutes = require('./twilo.route');

router.use(dashboardRoutes);
router.use(campigneRoutes);
router.use(clientRoutes);
router.use(companyRoutes);
router.use(permissionsRoutes);
router.use(roleRoutes);
router.use(packageRoutes);
router.use(employeeRoutes);
router.use(leadRoutes);
router.use(adminRoutes);
router.use(uploadsRoutes);
router.use(twiloRoutes);

module.exports = router;
