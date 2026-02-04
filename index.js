/**
 * Shoe Catalog Backend - Matches Android app API exactly
 * Supabase (DB + Storage) | Render deployment
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';

const app = express();

app.use(cors());
app.use(express.json());

// Validate env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const IMAGES_BUCKET = 'uploads';
const PDFS_BUCKET = 'pdfs';

// Supabase tables: brands (id, brand_name), products (id, product_name, brand_name, brand_id, product_image)
// Storage buckets: uploads (images), pdfs (generated PDFs)

// Multer memory storage for product_image
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  },
});

function uniqueFilename(ext) {
  return `product-${Date.now()}-${randomUUID()}${ext}`;
}

// Auth stub - app may call it, return success
app.post('/auth/login', (req, res) => {
  res.json({ success: true, token: 'no-auth' });
});

// ── BRANDS ─────────────────────────────────────────────────────────────
app.get('/brands', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Brands fetch:', error.message);
      return res.status(500).json({ error: 'Failed to fetch brands' });
    }

    // App expects _id and brand_name (table may use "name")
    const out = (data || []).map((b) => ({
      _id: b.id,
      brand_name: b.name || b.brand_name,
    }));
    res.json(out);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/brands', async (req, res) => {
  try {
    const { brand_name, name: nameFromBody } = req.body || {};
    const raw = brand_name ?? nameFromBody;
    if (!raw || typeof raw !== 'string') {
      return res.status(400).json({ error: 'brand_name or name is required' });
    }

    const name = String(raw).trim();
    if (!name) return res.status(400).json({ error: 'brand_name is required' });

    // Table uses "name" column; app expects brand_name in response
    const { data: existing } = await supabase
      .from('brands')
      .select('id, name')
      .ilike('name', name)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(201).json({
        success: true,
        brand: { _id: existing[0].id, brand_name: existing[0].name || existing[0].brand_name },
      });
    }

    const { data, error } = await supabase
      .from('brands')
      .insert([{ name }])
      .select('id, name')
      .single();

    if (error) {
      console.error('Brand insert:', error.message);
      return res.status(500).json({ error: 'Failed to create brand' });
    }

    res.status(201).json({
      success: true,
      brand: { _id: data.id, brand_name: data.name || data.brand_name },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PRODUCTS ───────────────────────────────────────────────────────────
app.get('/brands/:id/products', async (req, res) => {
  try {
    const brandId = req.params.id;
    if (!brandId) return res.status(400).json({ error: 'Brand ID required' });

    const { data, error } = await supabase
      .from('products')
      .select('id, name, product_name, brand_name, product_image')
      .eq('brand_id', brandId);

    if (error) {
      console.error('Products fetch:', error.message);
      return res.status(500).json({ error: 'Failed to fetch products' });
    }

    const out = (data || []).map((p) => ({
      _id: p.id,
      product_name: p.product_name ?? p.name,
      brand_name: p.brand_name,
      product_image: p.product_image || '',
    }));
    res.json(out);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/products', (req, res, next) => {
  upload.single('product_image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        error: err.message === 'Only image files allowed'
          ? 'Only image files are allowed'
          : 'Product image is required',
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Product image is required' });
    }

    const productName = req.body?.product_name?.trim?.();
    const brandName = req.body?.brand_name?.trim?.();
    if (!productName || !brandName) {
      return res.status(400).json({
        error: 'product_name and brand_name are required',
      });
    }

    // Find or create brand (table uses "name" column)
    const { data: existingBrands } = await supabase
      .from('brands')
      .select('id')
      .ilike('name', brandName)
      .limit(1);

    let brand = existingBrands?.[0];
    if (!brand) {
      const { data: newBrand, error: brandErr } = await supabase
        .from('brands')
        .insert([{ name: brandName }])
        .select('id')
        .single();
      if (brandErr) {
        console.error('Brand create:', brandErr.message);
        return res.status(500).json({ error: 'Failed to create brand' });
      }
      brand = newBrand;
    }

    // Resize and upload image (fallback to original if Sharp fails)
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: 'Image file is empty or corrupted' });
    }
    const ext = path.extname(req.file.originalname) || '.jpg';
    const fileName = uniqueFilename(ext.endsWith('.jpg') || ext.endsWith('.jpeg') ? ext : '.jpg');

    let bufferToUpload = req.file.buffer;
    try {
      bufferToUpload = await sharp(req.file.buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch (sharpErr) {
      // Use original buffer if resize fails (e.g. corrupt or minimal JPEG)
    }

    const { error: uploadErr } = await supabase.storage
      .from(IMAGES_BUCKET)
      .upload(fileName, bufferToUpload, { contentType: 'image/jpeg', upsert: false });

    if (uploadErr) {
      console.error('Image upload:', uploadErr.message);
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const { data: urlData } = supabase.storage
      .from(IMAGES_BUCKET)
      .getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    // Create product (Supabase table has "name" column for product name)
    const productRow = {
      name: productName || 'Untitled',
      brand_name: brandName,
      brand_id: brand.id,
      product_image: imageUrl,
    };
    const { data: product, error: productErr } = await supabase
      .from('products')
      .insert([productRow])
      .select('id, name, product_name, brand_name, product_image')
      .single();

    if (productErr) {
      console.error('Product insert:', productErr.message);
      await supabase.storage.from(IMAGES_BUCKET).remove([fileName]);
      return res.status(500).json({ error: 'Failed to create product', detail: productErr.message });
    }

    // Ensure product_image is saved (some schemas need explicit update)
    if (!product.product_image && imageUrl) {
      await supabase.from('products').update({ product_image: imageUrl }).eq('id', product.id);
      product.product_image = imageUrl;
    }

    res.status(201).json({
      message: 'Product created successfully',
      product: {
        _id: product.id,
        product_name: product.product_name ?? product.name,
        brand_name: product.brand_name,
        product_image: product.product_image,
      },
    });
  } catch (err) {
    console.error('Product create error:', err.message);
    res.status(500).json({ error: 'Server error', detail: err.message });
  }
});

// ── PDF GENERATION ─────────────────────────────────────────────────────
app.post('/pdf/generate', async (req, res) => {
  try {
    const { product_ids } = req.body || {};
    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ error: 'product_ids array is required' });
    }

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, product_name, brand_name, product_image')
      .in('id', product_ids);

    if (error || !products?.length) {
      return res.status(404).json({ error: 'No products found' });
    }

    const timestamp = Date.now();
    const filename = `catalog-${timestamp}.pdf`;
    const tmpPath = path.join(os.tmpdir(), 'pdfgen');
    if (!fs.existsSync(tmpPath)) fs.mkdirSync(tmpPath, { recursive: true });
    const filepath = path.join(tmpPath, filename);

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const writeStream = fs.createWriteStream(filepath);
    doc.pipe(writeStream);
    const streamDone = new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const pageWidth = 595;
    const margin = 50;
    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = 742;
    const imageAreaHeight = contentHeight * 0.7;

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (i > 0) doc.addPage();

      doc.rect(0, 0, 595, 842).fill('white');
      doc.fontSize(20).fillColor('black');
      doc.text('Brand: ' + (p.brand_name || ''), margin, margin + 20, {
        width: contentWidth,
        align: 'center',
      });
      doc.fontSize(18);
      // Use product_name if present, otherwise fall back to name, then empty string
      doc.text('Name: ' + (p.product_name || p.name || ''), margin, margin + 60, {
        width: contentWidth,
        align: 'center',
      });

      const imgUrl = p.product_image || p.product_image_url || p.image_url;
      if (imgUrl) {
        try {
          let imgBuf = null;
          const imgRes = await fetch(imgUrl);
          if (imgRes.ok) {
            imgBuf = Buffer.from(await imgRes.arrayBuffer());
          }
          if (!imgBuf?.length && imgUrl.includes(IMAGES_BUCKET)) {
            const match = imgUrl.match(/\/uploads\/([^?#]+)/) || imgUrl.match(/uploads%2F([^?#&]+)/);
            const storagePath = match ? decodeURIComponent(match[1]) : imgUrl.split('/').pop();
            const { data: dlData, error: dlErr } = await supabase.storage
              .from(IMAGES_BUCKET)
              .download(storagePath);
            if (!dlErr && dlData) imgBuf = Buffer.from(await dlData.arrayBuffer());
          }
          if (imgBuf?.length) {
            doc.image(imgBuf, margin, margin + 100, {
              fit: [contentWidth, imageAreaHeight],
              align: 'center',
              valign: 'center',
            });
          } else {
            doc.text('Image not available', margin, margin + 100);
          }
        } catch (e) {
          doc.text('Image not available', margin, margin + 100);
        }
      }
    }

    doc.end();
    await streamDone;

    // Upload PDF to Supabase Storage
    const pdfBuffer = fs.readFileSync(filepath);
    try {
      fs.unlinkSync(filepath);
    } catch (_) {}

    const { error: pdfUploadErr } = await supabase.storage
      .from(PDFS_BUCKET)
      .upload(filename, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (pdfUploadErr) {
      console.error('PDF upload:', pdfUploadErr.message);
      return res.status(500).json({ error: 'Failed to save PDF' });
    }

    const { data: pdfUrlData } = supabase.storage
      .from(PDFS_BUCKET)
      .getPublicUrl(filename);

    const downloadUrl = pdfUrlData.publicUrl;

    res.json({
      message: 'PDF generated successfully',
      pdf_id: timestamp.toString(),
      filename,
      download_url: downloadUrl,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
