// Test MongoDB connection
require('dotenv').config();
const mongoose = require('mongoose');

const testConnection = async () => {
  try {
    console.log('Testing MongoDB connection...');
    console.log('Connection string:', process.env.MONGODB_URI?.replace(/:[^:@]+@/, ':****@'));
    
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shoe_catalog', {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ MongoDB connected successfully!');
    console.log('Host:', conn.connection.host);
    console.log('Database:', conn.connection.name);
    
    // Test a simple query
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    console.log(`✅ Database query successful! User count: ${userCount}`);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB connection failed!');
    console.error('Error:', err.message);
    console.error('\nTroubleshooting tips:');
    console.error('1. Check if your IP is whitelisted in MongoDB Atlas');
    console.error('2. Verify your connection string is correct');
    console.error('3. Check your internet connection');
    console.error('4. Make sure MongoDB Atlas cluster is running');
    process.exit(1);
  }
};

testConnection();

