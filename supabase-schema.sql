-- Run in Supabase SQL Editor. Create storage buckets "uploads" and "pdfs" in Dashboard > Storage.
-- IMPORTANT: Set "uploads" bucket to PUBLIC so product image URLs work in app and PDF.

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null unique
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  brand_name text not null,
  brand_id uuid references brands(id) on delete cascade,
  product_image text
);

create index if not exists products_brand_id on products(brand_id);
