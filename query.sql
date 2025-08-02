CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    category VARCHAR(50),
    category_id INTEGER REFERENCES public.categories(id)
);

-----------------------------------------
CREATE TABLE IF NOT EXISTS public.top_products (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES public.products(id) ON DELETE CASCADE,
    display_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
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
CREATE TABLE IF NOT EXISTS public.orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    address_id INTEGER REFERENCES public.user_addresses(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    payment_status TEXT DEFAULT 'Pending'
);

-------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES public.products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    customization_text TEXT,
    image_path TEXT,
    whatsapp VARCHAR(15),
    use_default BOOLEAN,
    unit_price NUMERIC(10, 2),
    subtotal NUMERIC(10, 2)
);

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
----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES public.products(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    review_image TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
