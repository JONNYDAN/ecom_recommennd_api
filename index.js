const express = require('express');
const dbConnect = require('./config/db_connect');
const bodyParser = require('body-parser');
const app = express();
// eslint-disable-next-line no-unused-vars
const dotenv = require('dotenv').config();
const PORT = process.env.PORT || 4444;
const authRouter = require('./routes/auth_routes');
const dashboardRouter = require('./routes/dashboard_router');
const avatarRouter = require('./routes/avatar_routes');
const postRouter = require('./routes/post_routes');
const noteRouter = require('./routes/note_routes');
const categoryRoutes = require('./routes/category_router');
const productRouter = require('./routes/product_router');
const customerFeedbackRouter = require('./routes/customer_feedback_router');
const orderRouter = require('./routes/order_routes');
const orderRecommendationsRouter = require('./routes/recommendation_routes');

const { notFound, errorHandler } = require('./middlewares/error_handler');
const morgan = require('morgan');
const cors = require("cors");
const helmet = require('helmet');

// Add these imports
const swaggerUI = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const HOST = process.env.APP_HOST || 'localhost';

const URL = `http://${HOST}:${process.env.PORT}` || `http://localhost:${process.env.PORT}`;

dbConnect();

app.use(cors({ origin: "*" }));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Ảnh có thể được truy cập
app.use("/uploads", express.static("public/uploads"));
app.use("/audio", express.static("public/audio"));

// This disables the Content-Security-Policy
// and X-Download-Options headers.
app.use(
  helmet({
    contentSecurityPolicy: false,
    xDownloadOptions: false,
  })
);

// Add Swagger middleware - add this before your route registrations
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Add a route to serve the OpenAPI spec as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// server static files
app.use(express.static('public'));
app.use('/api/user', authRouter);
app.use('/api', dashboardRouter);
app.use('/api/avatar', avatarRouter);
app.use('/api/post', postRouter);
app.use('/api/notes', noteRouter);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRouter);
app.use('/api/feedbacks', customerFeedbackRouter);
app.use('/api/orders', orderRouter);
app.use('/api/recommendations', orderRecommendationsRouter);

app.use(notFound);
app.use(errorHandler);

app.get('/', (req, res) => {
  res.send('Ecom API is running...');
});

app.listen(PORT, () => {
  console.log(`Server is running at ${URL}`);
});

