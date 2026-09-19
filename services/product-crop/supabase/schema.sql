-- Run once in the stmx-web Supabase project's SQL editor.
--
-- products is stmx-web's table (stmx-web sqls/phase2/11_products.sql);
-- POST /save-product-image only updates products.image_url / thumbnail / sale_price.

-- Public bucket for cropped product images
--   products/<products.id>.<ext>        original crop  → products.image_url
--   products/thumb/<products.id>.webp   200px WebP     → products.thumbnail
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- List thumbnail column (same as stmx-web supabase/migrations/12_product_thumbnails.sql).
alter table public.products
    add column if not exists thumbnail text;
