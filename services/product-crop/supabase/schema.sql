-- Run once in the stmx-web Supabase project's SQL editor.
--
-- products is stmx-web's table (stmx-web sqls/phase2/11_products.sql);
-- POST /save-product-image only updates products.image_url.

-- Public bucket for cropped product images (objects: products/<products.id>.<ext>)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;
