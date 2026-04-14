// Start cron jobs
require('./cron/autoapi');

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db.config');


const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Rate Limiter
// const limiter = rateLimit({
// 	windowMs: 15 * 60 * 1000, // 15 minutes
// 	max: 100, // limit each IP to 100 requests per windowMs
// 	standardHeaders: true,
// 	legacyHeaders: false,
// });
// app.use(limiter);

// Connect to MongoDB
connectDB();



// Swagger API docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Register all routes
const allRoutes = require('./routes/all.route');
const authMiddleware = require('./middleware/permission.middleware');
app.use('/api', authMiddleware(), allRoutes);

// Basic route
app.get('/', (req, res) => {
	res.send('API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
