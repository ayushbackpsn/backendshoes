const express = require('express');
const router = express.Router();
const Brand = require('../models/Brand');

// CREATE BRAND
router.post('/', async (req, res) => {
  try {
    const { brand_name } = req.body;
    if (!brand_name) {
      return res.status(400).json({ error: 'brand_name is required' });
    }
    const brand = new Brand({ brand_name });
    await brand.save();
    res.json({ success: true, brand });
  } catch (error) {
    console.error('Error creating brand:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /brands
router.get('/', async (req, res) => {
  try {
    const brands = await Brand.find().sort({ brand_name: 1 });
    res.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /brands/:id/products
router.get('/:id/products', async (req, res) => {
  try {
    const Product = require('../models/Product');
    const products = await Product.find({ brand_id: req.params.id });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const products = await Product.find().populate('brand_id', 'brand_name');
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
