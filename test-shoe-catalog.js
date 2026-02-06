/**
 * Test script for shoe catalog: photo upload + PDF generation
 * Run: node test-shoe-catalog.js
 * Tests: brands, products (with image), PDF generate
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.BASE_URL || 'https://backendshoes.onrender.com';

// Valid minimal 1x1 pixel JPEG (base64)
const MINI_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAAFJAAAAAQIEAwRHBIhMUFRYRMicYEyJpGhBscHRQuHwFjFichJib/2gAMAwEAAhEDEQA/AD8A/wA//2Q==',
  'base64'
);

function createTestImage() {
  const p = path.join(__dirname, 'test-product.jpg');
  writeFileSync(p, MINI_JPEG);
  return p;
}

async function run() {
  console.log('\n📤 Testing Payal Footwear - Photo Upload & PDF Sharing\n');
  console.log(`Backend: ${BASE_URL}\n`);

  let brandId, productIds = [];

  // 1. Health check
  try {
    const r = await fetch(`${BASE_URL}/health`);
    const h = await r.json();
    if (h.status === 'OK') {
      console.log('✅ Health check: OK');
    } else {
      console.log('⚠️ Health:', h);
    }
  } catch (e) {
    console.log('❌ Backend not reachable:', e.message);
    console.log('   (Render may be spinning up - cold starts take ~30s)\n');
    process.exit(1);
  }

  // 2. Create brand
  try {
    const r = await fetch(`${BASE_URL}/brands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand_name: 'TEST_BRAND' }),
    });
    const d = await r.json();
    if (r.ok && d.brand) {
      brandId = d.brand._id;
      console.log('✅ POST /brands: Created brand', d.brand.brand_name);
    } else {
      console.log('⚠️ POST /brands:', r.status, d);
      const list = await fetch(`${BASE_URL}/brands`);
      const brands = await list.json();
      const b = Array.isArray(brands) && brands.find((x) => x.brand_name === 'TEST_BRAND');
      if (b) brandId = b._id;
    }
  } catch (e) {
    console.log('❌ POST /brands:', e.message);
  }

  // 3. Create product with image
  const imgPath = createTestImage();
  try {
    const form = new FormData();
    form.append('product_name', 'Test Shoe');
    form.append('brand_name', 'TEST_BRAND');
    form.append('product_image', new Blob([readFileSync(imgPath)], { type: 'image/jpeg' }), 'test-product.jpg');

    const r = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      body: form,
    });
    const d = await r.json();
    if (r.ok && d.product) {
      productIds.push(d.product._id);
      console.log('✅ POST /products: Uploaded photo, created product', d.product.product_name);
    } else {
      console.log('❌ POST /products:', r.status, d);
    }
  } catch (e) {
    console.log('❌ POST /products:', e.message);
  }

  // 4. Get products by brand
  if (brandId) {
    try {
      const r = await fetch(`${BASE_URL}/brands/${brandId}/products`);
      const list = await r.json();
      if (r.ok && Array.isArray(list)) {
        console.log('✅ GET /brands/:id/products:', list.length, 'products');
        if (productIds.length === 0 && list.length > 0) {
          productIds = list.map((p) => p._id);
        }
      }
    } catch (e) {
      console.log('❌ GET /brands/:id/products:', e.message);
    }
  }

  // 5. Generate PDF
  if (productIds.length > 0) {
    try {
      const r = await fetch(`${BASE_URL}/pdf/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_ids: productIds }),
      });
      const d = await r.json();
      if (r.ok && d.download_url) {
        console.log('✅ POST /pdf/generate: PDF generated');
        console.log('   Download URL:', d.download_url);
      } else {
        console.log('❌ POST /pdf/generate:', r.status, d);
      }
    } catch (e) {
      console.log('❌ POST /pdf/generate:', e.message);
    }
  } else {
    console.log('⏭️  Skipping PDF test (no products)');
  }

  console.log('\n✨ Shoe catalog tests complete.\n');
}

run();
