# Shoe Catalog Backend API

Backend API for the Shoe Catalog Android application. Built with Node.js, Express, and MongoDB.

## Features

- Authentication (JWT-based)
- Brand and Product management
- PDF generation with custom layout
- Image upload and processing
- Persistent PDF storage

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or connection string)
- npm or yarn

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/shoe_catalog
JWT_SECRET=your_jwt_secret_key_here
UPLOAD_DIR=uploads
PDF_OUTPUT_DIR=pdfs
```

4. Make sure MongoDB is running on your system.

5. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

The server will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /auth/login` - User login

### Brands
- `GET /brands` - Get all brands
- `GET /brands/:id/products` - Get products by brand ID

### Products
- `POST /products` - Create a new product (requires image upload)

### PDF
- `POST /pdf/generate` - Generate PDF catalog from selected products
- `GET /pdf/:filename` - Download generated PDF

## Database Models

### Brand
- `id` (ObjectId)
- `brand_name` (String)

### Product
- `id` (ObjectId)
- `product_name` (String)
- `brand_name` (String)
- `brand_id` (ObjectId, reference to Brand)
- `product_image` (String, path to image file)

### User
- `id` (ObjectId)
- `username` (String, unique)
- `password` (String, hashed)

### GeneratedPDF
- `id` (ObjectId)
- `filename` (String)
- `filepath` (String)
- `product_ids` (Array of ObjectId)
- `download_url` (String)

## PDF Generation

The PDF generation creates A4 portrait pages with:
- Brand name at the top
- Product name below brand
- Product image taking 70% of page height, centered
- White background
- One product per page

## File Structure

```
backend/
├── models/          # MongoDB models
├── routes/          # API route handlers
├── uploads/         # Uploaded product images (created automatically)
├── pdfs/           # Generated PDF files (created automatically)
├── server.js       # Main server file
└── package.json    # Dependencies
```

## Notes

- Image uploads are stored in the `uploads/` directory
- Generated PDFs are stored in the `pdfs/` directory
- Images are automatically resized to maintain aspect ratio
- PDFs are stored persistently and can be downloaded via URL

