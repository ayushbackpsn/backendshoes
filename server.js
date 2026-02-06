const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images and PDFs
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/pdfs', express.static(path.join(__dirname, 'pdfs')));

// Create directories if they don't exist
const dirs = ['uploads', 'pdfs'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shoe_catalog');
    console.log('MongoDB connected:', conn.connection.host);
    return true;
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    console.error('Full error:', err);
    return false;
  }
};

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/brands', require('./routes/brands'));
app.use('/products', require('./routes/products'));
app.use('/pdf', require('./routes/pdf'));

// Health check
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    database: dbStatus
  });
});

// Start server after MongoDB connection
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  const connected = await connectDB();
  if (!connected) {
    console.error('Failed to connect to MongoDB. Server will not start.');
    process.exit(1);
  }
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();

