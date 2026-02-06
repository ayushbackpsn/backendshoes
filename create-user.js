// Create a test user
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createUser = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shoe_catalog');
    console.log('MongoDB connected!');

    const username = 'harsh';
    const password = 'harsh1234';

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log(`User '${username}' already exists!`);
      console.log('You can try logging in with these credentials.');
      process.exit(0);
    }

    // Create new user
    const user = new User({ username, password });
    await user.save();
    
    console.log(`✅ User created successfully!`);
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('\nYou can now login with these credentials.');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
};

createUser();

