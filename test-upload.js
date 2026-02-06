/**
 * Test script for PDF and photo upload (Supabase backend - index.js)
 * Run: node test-upload.js
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
 * 
 * For MongoDB backend (server.js) product upload, use:
 * curl -X POST http://localhost:3000/products \
 *   -F "product_name=Test" -F "brand_name=TEST" \
 *   -F "product_image=@/path/to/image.jpg"
 */

import 'dotenv/config';
import { createReadStream, existsSync } from 'fs';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testUpload(filePath, description) {
  if (!existsSync(filePath)) {
    console.log(`⏭️  Skipping ${description}: file not found at ${filePath}`);
    return null;
  }

  const formData = new FormData();
  const file = new Blob([readFileSync(filePath)]);
  const ext = path.extname(filePath);
  const mime = ext === '.pdf' ? 'application/pdf' : `image/${ext.slice(1) || 'jpeg'}`;
  formData.append('file', file, path.basename(filePath));

  try {
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`✅ ${description}: SUCCESS`);
      console.log(`   File: ${data.file_name}, Type: ${data.file_type}, URL: ${data.file_url?.slice(0, 60)}...`);
      return data;
    } else {
      console.log(`❌ ${description}: FAILED (${res.status})`);
      console.log(`   ${JSON.stringify(data)}`);
      return null;
    }
  } catch (err) {
    console.log(`❌ ${description}: ERROR - ${err.message}`);
    return null;
  }
}

async function testGetFiles() {
  try {
    const res = await fetch(`${BASE_URL}/files?sort=date_desc`);
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ GET /files: SUCCESS (${Array.isArray(data) ? data.length : 0} files)`);
      return data;
    } else {
      console.log(`❌ GET /files: FAILED (${res.status})`);
      return null;
    }
  } catch (err) {
    console.log(`❌ GET /files: ERROR - ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('\n📤 Testing Payal Footwear upload system\n');
  console.log(`Backend: ${BASE_URL}\n`);

  // Test 1: Health check
  try {
    const health = await fetch(`${BASE_URL}/health`);
    const h = await health.json();
    if (h.status === 'OK') {
      console.log('✅ Health check: OK\n');
    } else {
      console.log('⚠️ Health check: unexpected response\n');
    }
  } catch (err) {
    console.log(`❌ Backend not reachable at ${BASE_URL}`);
    console.log('   Start the backend with: cd backend && node index.js');
    console.log('   Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in .env\n');
    process.exit(1);
  }

  // Test 2: Image upload (create a minimal test image if none exists)
  const testImage = path.join(__dirname, 'test-image.jpg');
  const testPdf = path.join(__dirname, 'test-document.pdf');

  await testUpload(testImage, 'Image upload (test-image.jpg)');
  await testUpload(testPdf, 'PDF upload (test-document.pdf)');

  // Test 3: Invalid file type
  console.log('\n📋 Testing invalid file rejection...');
  try {
    const fd = new FormData();
    fd.append('file', new Blob(['test'], { type: 'text/plain' }), 'test.txt');
    const res = await fetch(`${BASE_URL}/upload`, { method: 'POST', body: fd });
    const data = await res.json();
    if (res.status === 400 && data.error) {
      console.log('✅ Invalid file type correctly rejected\n');
    } else {
      console.log(`⚠️ Expected 400, got ${res.status}\n`);
    }
  } catch (err) {
    console.log(`❌ Error: ${err.message}\n`);
  }

  // Test 4: Get files list
  const files = await testGetFiles();

  // Test 5: Share (if we have PDFs)
  if (Array.isArray(files) && files.length > 0) {
    const pdfIds = files.filter(f => f.file_type === 'pdf').map(f => f.id).slice(0, 2);
    if (pdfIds.length > 0) {
      try {
        const shareRes = await fetch(`${BASE_URL}/share`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_ids: pdfIds }),
        });
        const shareData = await shareRes.json();
        if (shareRes.ok && shareData.files) {
          console.log(`\n✅ POST /share: SUCCESS (${shareData.files.length} PDFs)`);
        }
      } catch (e) {
        console.log(`\n❌ POST /share: ${e.message}`);
      }
    }
  }

  console.log('\n✨ Upload tests complete.\n');
}

main();
