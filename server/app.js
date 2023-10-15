const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');
const history = require('connect-history-api-fallback');
const httpOverride = require('./middleware/httpOverride');
const dotenv = require('dotenv');
dotenv.config();

// Variables
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/GoCarGoDB';
//const mongoURI = 'mongodb://localhost:27017/GoCarGoDB';

const port = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(mongoURI)
  .then(() => {
    console.log(`Connected to MongoDB with URI: ${mongoURI}`);
  })
  .catch(err => {
    console.error(`Failed to connect to MongoDB with URI: ${mongoURI}`);
    console.error(err.stack);
    process.exit(1);
  });

// Create Express app
const app = express();

// Fix stripe webhook validation issues by using express.raw for the webhook endpoint
app.use('/api/v1/stripe-webhook', express.raw({ type: 'application/json' }));
// fixing "413 Request Entity Too Large" errors
app.use(express.json({limit: "10mb", extended: true}))
app.use(express.urlencoded({limit: "10mb", extended: true, parameterLimit: 50000}))
// HTTP request logger
app.use(morgan('dev'));
// Enable cross-origin resource sharing for frontend must be registered before api
app.options('*', cors());
app.use(cors());

// Import routes
app.get('/api', function(req, res) {
    res.json({'message': 'Car Rental Service backend API v1'});
});

// Import middleware
app.use(httpOverride);

const userRoutes = require('./routes/user'); // Import user routes
const carRoutes = require('./routes/car'); // Import car routes
const bookingRoutes = require('./routes/booking'); // Import booking routes
const managerRoutes = require('./routes/manager'); // Import manager routes
const paymentRoutes = require('./routes/payment'); // Import payment routes

//Define API routes
app.use(userRoutes);
app.use(carRoutes);
app.use(bookingRoutes);
app.use(managerRoutes);
app.use(paymentRoutes);

// Catch all non-error handler for api (i.e., 404 Not Found)
app.use('/api/*', function (req, res) {
    res.status(404).json({ 'message': 'Not Found' });
});

// Configuration for serving frontend in production mode
// Support Vuejs HTML 5 history mode
app.use(history());
// Serve static assets
const root = path.normalize(__dirname + '/..');
const client = path.join(root, 'client', 'dist');
app.use(express.static(client));

// Error handler (i.e., when exception is thrown) must be registered last
const env = app.get('env');
// eslint-disable-next-line no-unused-vars
app.use(function(err, req, res, next) {
    console.error(err.stack);
    const err_res = {
        'message': err.message,
        'error': {}
    };
    if (env === 'development') {
        // Return sensitive stack trace only in dev mode
        err_res['error'] = err.stack;
    }
    res.status(err.status || 500);
    res.json(err_res);
});

app.listen(port, function(err) {
    if (err) throw err;
    console.log(`Express server listening on port ${port}, in ${env} mode`);
    console.log(`Backend: http://localhost:${port}/api/`);
    console.log(`Frontend (production): http://localhost:${port}/`);
});

module.exports = app;
