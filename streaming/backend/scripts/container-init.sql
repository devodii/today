
-- This will get executed automatically when the container starts

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  image_url TEXT,
  inventory_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert some sample data
INSERT INTO products (name, description, price, category, inventory_count)
SELECT 
  'Product ' || i,
  'Description for product ' || i,
  (random() * 1000)::numeric(10,2),
  (ARRAY['Electronics', 'Clothing', 'Books', 'Home', 'Beauty'])[floor(random() * 5 + 1)],
  floor(random() * 1000)::int
FROM generate_series(1, 10000) i;