const express = require('express');
const router = express.Router();
const employeeController = require('../controller/employee.controller');


/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create a new employee
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Employee's name
 *               email:
 *                 type: string
 *                 description: Employee's email
 *               phone:
 *                 type: string
 *                 description: Employee's phone number
 *               role:
 *                 type: string
 *                 description: Role ID
 *               company:
 *                 type: string
 *                 description: Company ID
 *               password:
 *                 type: string
 *                 description: Employee's password
 *               status:
 *                 type: integer
 *                 description: 1-active, 0-inactive
 *             required:
 *               - name
 *               - email
 *               - role
 *               - company
 *               - password
 *     responses:
 *       201:
 *         description: Employee created successfully
 *   get:
 *     summary: Get all employees
 *     tags: [Employees]
 *     responses:
 *       200:
 *         description: List of employees
 */
router.post('/employees', employeeController.createEmployee);
/**
 * @swagger
 * /employees:
 *   get:
 *     summary: Get all employees with search, pagination, filters, and sorting
 *     tags: [Employees]
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
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, email, or phone
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *         description: Employee status (1-active, 0-inactive)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Role ID
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *         description: Company ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: "Field to sort by (default: createdAt)"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *         description: "Sort order (asc or desc, default: desc)"
 *     responses:
 *       200:
 *         description: List of employees with pagination, filters, and sorting. Sensitive fields excluded.
 */
router.get('/employees', employeeController.getEmployees);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get an employee by ID
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee data
 *   put:
 *     summary: Update an employee by ID
 *     tags: [Employees]
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
 *                 description: Employee's name
 *               email:
 *                 type: string
 *                 description: Employee's email
 *               phone:
 *                 type: string
 *                 description: Employee's phone number
 *               role:
 *                 type: string
 *                 description: Role ID
 *               company:
 *                 type: string
 *                 description: Company ID
 *               password:
 *                 type: string
 *                 description: Employee's password
 *               status:
 *                 type: integer
 *                 description: 1-active, 0-inactive
 *             required:
 *               - name
 *               - email
 *               - role
 *               - company
 *     responses:
 *       200:
 *         description: Employee updated
 *   delete:
 *     summary: Soft delete an employee by ID (sets deleted flag)
 *     tags: [Employees]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Employee soft deleted
 */
router.get('/employees/:id', employeeController.getEmployeeById);
router.put('/employees/:id', employeeController.updateEmployee);
router.delete('/employees/:id', employeeController.deleteEmployee);

/**
 * @swagger
 * /employees/login:
 *   post:
 *     summary: Employee login
 *     tags: [Employees]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Employee's email
 *               password:
 *                 type: string
 *                 description: Employee's password
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/employees/login', employeeController.login);

/**
 * @swagger
 * /employees/{id}/change-password:
 *   post:
 *     summary: Change employee password
 *     tags: [Employees]
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
 *               oldPassword:
 *                 type: string
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 description: New password
 *             required:
 *               - oldPassword
 *               - newPassword
 *     responses:
 *       200:
 *         description: Password changed
 */
router.post('/employees/:id/change-password', employeeController.changePassword);

module.exports = router;
