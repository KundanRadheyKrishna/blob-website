require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { attachUser } = require('./middlewares/authMiddleware');

const indexRoutes = require('./routes/indexRoutes');
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// View Engine & Static Assets
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Body Parsing & Cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global Auth Context Middleware
app.use(attachUser);

// Route Mounting
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/', postRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
