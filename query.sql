CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-----------------------------------------

INSERT INTO products (name, price, description, image_url)
VALUES 
('Wooden Name Plate', 499.00, 'Custom engraved wooden plate', '/images/product1.jpg'),
('LED Acrylic Lamp', 899.00, 'Laser-engraved LED lamp', '/images/product2.jpg'),
('Customized Keychain', 199.00, 'Small laser-etched keychain', '/images/product3.jpg'),
('Engraved Frame', 699.00, 'Wooden frame with name engraving', '/images/product4.jpg');
---------------------------

ALTER TABLE products ADD COLUMN category VARCHAR(50);

------------------------------------------
UPDATE products SET category = 'wood' WHERE id = 1;
UPDATE products SET category = 'led' WHERE id = 2;
UPDATE products SET category = 'wood' WHERE id = 3;
UPDATE products SET category = 'led' WHERE id = 4;

-- and so on...
------------------

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-------------------------------------------

CREATE TABLE user_profiles (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  profile_picture_url TEXT,
  phone_number VARCHAR(15),
  gender VARCHAR(10),  -- e.g. Male, Female, Other
  date_of_birth DATE,
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

----------------------------------
CREATE TABLE user_addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  address_type VARCHAR(50) NOT NULL,        -- e.g. Home, Work, Other
  full_name VARCHAR(100) NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

---------------------------------
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Pending',  -- Pending, Shipped, Delivered, Cancelled, etc.
    total_amount NUMERIC(10, 2) NOT NULL,
    shipping_address_id INTEGER REFERENCES user_addresses(id),
    billing_address_id INTEGER REFERENCES user_addresses(id),
    payment_method VARCHAR(50),             -- COD, UPI, Card, etc.
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-------------------------------------------
-- Table: public.order_items

-- DROP TABLE IF EXISTS public.order_items;

CREATE TABLE IF NOT EXISTS public.order_items
(
    id integer NOT NULL DEFAULT nextval('order_items_id_seq'::regclass),
    order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    CONSTRAINT order_items_pkey PRIMARY KEY (id),
    CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id)
        REFERENCES public.orders (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id)
        REFERENCES public.products (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.order_items
    OWNER to carvelane_db_57kd_user;
-------------------------------------------------------

CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  customization_text TEXT,
  image_path TEXT,
  whatsapp VARCHAR(15),
  use_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
----------------------------------------
ALTER TABLE orders
ADD COLUMN razorpay_order_id TEXT,
ADD COLUMN razorpay_payment_id TEXT,
ADD COLUMN razorpay_signature TEXT,
ADD COLUMN payment_status TEXT DEFAULT 'Pending';

-----------------------------------------------------

ALTER TABLE orders
ADD COLUMN status VARCHAR DEFAULT 'Placed',
ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
----------------------------------------------------------

