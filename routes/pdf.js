const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');

// POST /pdf/generate
router.post('/generate', async (req, res) => {
  try {
    const { product_ids } = req.body;

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ error: 'Product IDs array is required' });
    }

    // Fetch products
    const products = await Product.find({ _id: { $in: product_ids } });

    if (products.length === 0) {
      return res.status(404).json({ error: 'No products found' });
    }

    // Generate PDF filename
    const timestamp = Date.now();
    const filename = `catalog-${timestamp}.pdf`;
    const filepath = path.join(__dirname, '../pdfs', filename);

    // Create PDF document (A4 portrait: 595x842 points)
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Pipe PDF to file
    doc.pipe(fs.createWriteStream(filepath));

    // Generate pages for each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];

      // Start new page (except for first product)
      if (i > 0) {
        doc.addPage();
      }

      // Set white background
      doc.rect(0, 0, 595, 842).fill('white');

      // Page dimensions (A4: 595x842 points)
      const pageWidth = 595;
      const pageHeight = 842;
      const margin = 50;
      const contentWidth = pageWidth - (2 * margin);
      const contentHeight = pageHeight - (2 * margin);

      // Calculate image area (70% of page height)
      const imageAreaHeight = contentHeight * 0.70;
      const textAreaHeight = contentHeight * 0.30;

      // Product name at top
      doc.fontSize(20)
         .fillColor('black')
         .text('Name: ' + product.product_name, margin, margin + 20, {
           width: contentWidth,
           align: 'center'
         });

      // Brand name below product name
      doc.fontSize(18)
         .fillColor('black')
         .text('Brand: ' + product.brand_name, margin, margin + 60, {
           width: contentWidth,
           align: 'center'
         });

      // Image path
      const imagePath = path.join(__dirname, '../uploads', product.product_image);

      // Check if image exists
      if (fs.existsSync(imagePath)) {
        // Calculate image position and size
        // Image should take 70% of page height and be centered
        const imageY = margin + 100; // Start after text
        const maxImageHeight = imageAreaHeight;
        const maxImageWidth = contentWidth;

        try {
          // Get image dimensions
          const sharp = require('sharp');
          const imageInfo = await sharp(imagePath).metadata();
          
          // Calculate dimensions maintaining aspect ratio
          let imgWidth = imageInfo.width;
          let imgHeight = imageInfo.height;
          const aspectRatio = imgWidth / imgHeight;

          if (imgHeight > maxImageHeight) {
            imgHeight = maxImageHeight;
            imgWidth = imgHeight * aspectRatio;
          }

          if (imgWidth > maxImageWidth) {
            imgWidth = maxImageWidth;
            imgHeight = imgWidth / aspectRatio;
          }

          // Center image horizontally
          const imageX = margin + (contentWidth - imgWidth) / 2;
          const centeredImageY = imageY + (imageAreaHeight - imgHeight) / 2;

          // Add image to PDF
          doc.image(imagePath, imageX, centeredImageY, {
            fit: [imgWidth, imgHeight],
            align: 'center',
            valign: 'center'
          });
        } catch (imageError) {
          console.error('Error adding image to PDF:', imageError);
          doc.fontSize(14)
             .fillColor('red')
             .text('Image not available', margin, imageY, {
               width: contentWidth,
               align: 'center'
             });
        }
      } else {
        // Image not found
        doc.fontSize(14)
           .fillColor('red')
           .text('Image not found', margin, margin + 100, {
             width: contentWidth,
             align: 'center'
           });
      }
    }

    // Finalize PDF
    doc.end();

    // Wait for PDF to be written
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
    });

    // Return direct download URL (no database storage)
    const baseUrl = req.protocol + '://' + req.get('host');
    const downloadUrl = `${baseUrl}/pdf/${filename}`;

    res.json({
      message: 'PDF generated successfully',
      filename: filename,
      download_url: downloadUrl
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// GET /pdf/:id/download
router.get('/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, '../pdfs', filename);

    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Stream PDF file
    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading PDF:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

