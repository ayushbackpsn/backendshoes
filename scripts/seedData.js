// Script to seed initial data into MongoDB
// Run with: node scripts/seedData.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Brand = require('../models/Brand');
const User = require('../models/User');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shoe_catalog';

async function seedData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await Brand.deleteMany({});
    // await User.deleteMany({});

    // Seed Brands
    const brands = [
      { brand_name: 'FLITE-PU' },
      { brand_name: 'SPARX' },
      { brand_name: 'BATA' },
      { brand_name: 'NIKE' },
      { brand_name: 'ADIDAS' },
    ];

    for (const brandData of brands) {
      const existingBrand = await Brand.findOne({ brand_name: brandData.brand_name });
      if (!existingBrand) {
        const brand = new Brand(brandData);
        await brand.save();
        console.log(`Created brand: ${brandData.brand_name}`);
      } else {
        console.log(`Brand already exists: ${brandData.brand_name}`);
      }
    }

    // Seed Default User (for testing)
    const defaultUser = {
      username: 'admin',
      password: 'admin123'
    };

    const existingUser = await User.findOne({ username: defaultUser.username });
    if (!existingUser) {
      const user = new User(defaultUser);
      await user.save();
      console.log(`Created user: ${defaultUser.username} (password: ${defaultUser.password})`);
    } else {
      console.log(`User already exists: ${defaultUser.username}`);
    }

    console.log('Seed data completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seedData();

