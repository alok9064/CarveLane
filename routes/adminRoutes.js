import express from 'express';
import { upload } from '../middleware/upload.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { memoryUpload } from '../middleware/memoryUpload.js';
import { uploadToSupabase } from '../utils/supabaseUpload.js';
import dotenv from 'dotenv';
import  pool  from '../middleware/db.js';

const router = express.Router();
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Admin Login form
router.get('/login', (req, res) => {
  res.render('admin-login', { error: null });
});

// Handle login form
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Hardcoded credentials (can be replaced by DB check)
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  if (username === adminUser && password === adminPass) {
    req.session.isAdmin = true;
    res.redirect('/admin');
  } else {
    res.render('admin-login', { error: 'Invalid credentials' });
  }
});

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.redirect('/admin-login');
  }
}

router.get('/', requireAdmin, (req, res) => {
  res.render('admin', { user: req.session.user });
});

// Render add product form
router.get('/add-product', requireAdmin, async(req, res) => {
  const result = await pool.query('SELECT name FROM categories ORDER BY name ASC');
  res.render('addProduct', {categories: result.rows});
});

// Handle product form submission
router.post('/add-product', requireAdmin, memoryUpload.single('image'), async (req, res) => {
  const { name, price, description, category, customCategory } = req.body;
  const imageFile = req.file;

  if(!name || !price || !description || !imageFile) {
    return res.status(400).send("Missing fields");
  }

  let image_path = null;

  const finalCategory = category === '__custom__'? customCategory : category;
  // Ensure new category gets saved to DB
  if (category === '__custom__' && customCategory) {
    await pool.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [customCategory]);
  }

  try {
    const fileName = `custom_${Date.now()}_${req.file.originalname}`;
    image_path = await uploadToSupabase(req.file.buffer, fileName, "product-images", req.file.mimetype);
    await pool.query(
      'INSERT INTO products (name, price, description, image_url, category) VALUES ($1, $2, $3, $4, $5)',
      [name, price, description, image_path, finalCategory]
    );

    res.redirect('/admin/products');
  } catch (err) {
    console.error("❌ Error adding product:", err);
    res.status(500).send("Failed to add product");
  }
});

// View Products in Admin
router.get('/products', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    const products = result.rows;

    res.render('adminProducts', { products });
  } catch (err) {
    console.error("❌ Error loading admin products:", err);
    res.status(500).send("Could not load products");
  }
});

// Edit Product in Admin
router.get('/edit-product/:id', requireAdmin, async (req, res) => {
  const productId = req.params.id;

  try {
    const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    const product = productResult.rows[0];

    const categoryResult = await pool.query('SELECT name FROM categories ORDER BY name ASC');

    if (!product) {
      return res.status(404).send("Product not found");
    }

    res.render('editProduct', { product, categories: categoryResult.rows });
  } catch (err) {
    console.error("❌ Error fetching product for edit:", err);
    res.status(500).send("Could not fetch product");
  }
});

router.post('/edit-product/:id', requireAdmin, memoryUpload.single('image'), async (req, res) => {
  const productId = req.params.id;
  const { name, price, description, category, customCategory } = req.body;
  const imageFile = req.file;

  const finalCategory = category === '__custom__' ? customCategory : category;
  // Ensure new category gets saved to DB
  if (category === '__custom__' && customCategory) {
    await pool.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [customCategory]);
  }
  try {
    let image_url = req.body.currentImage;
    if (imageFile) {
      const fileName = `custom_${Date.now()}_${req.file.originalname}`;
      image_url = await uploadToSupabase(req.file.buffer, fileName, "product-images", req.file.mimetype);
      
    }
    await pool.query(
      'UPDATE products SET name = $1, price = $2, description = $3, image_url = $4, category = $5 WHERE id = $6',
      [name, price, description, image_url, finalCategory, productId]
    );

    res.redirect('/admin/products');
  } catch (err) {
    console.error("❌ Error updating product:", err);
    res.status(500).send("Failed to update product");
  }
});

// Delete Product in Admin
router.post('/delete-product/:id', requireAdmin, async (req, res) => {
  const productId = req.params.id;

  try {
    await pool.query('DELETE FROM products WHERE id = $1', [productId]);
    res.redirect('/admin/products');
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).send("Failed to delete product");
  }
});

router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const checkOrders = await pool.query('SELECT id FROM orders');
    console.log('Orders in DB:', checkOrders.rows.map(o => o.id));

    const ordersRes = await pool.query(`
      SELECT o.*, u.name AS customer_name
      FROM orders o
      INNER JOIN users u ON o.user_id = u.id
      WHERE o.id IN (SELECT id FROM orders)
      ORDER BY o.created_at DESC
    `);

    console.log('Orders being displayed:', ordersRes.rows.map(o => o.id));

    res.setHeader('Cache-Control', 'no-store');
    res.render('admin/orders', {
      orders: ordersRes.rows,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error("❌ Error fetching admin orders:", err);
    res.status(500).send("Failed to load admin orders.");
  }
});

router.get('/orders/:id', requireAdmin, async (req, res) => {
  const orderId = parseInt(req.params.id);

  try {
    const orderResult = await pool.query(`
      SELECT o.*, 
             u.name AS customer_name, 
             a.full_name, a.address_line1, a.address_line2, a.city, a.state, a.postal_code, a.country
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN user_addresses a ON o.address_id = a.id
      WHERE o.id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return res.status(404).send("Order not found");
    }

    const order = orderResult.rows[0];

    order.address = {
      full_name: order.full_name,
      address_line1: order.address_line1,
      address_line2: order.address_line2,
      city: order.city,
      state: order.state,
      postal_code: order.postal_code,
      country: order.country,
    };

    const itemResult = await pool.query(`
      SELECT oi.*, p.name AS product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);

    const items = itemResult.rows;

    res.render('admin/adminOrderDetail', { order, items });

  } catch (err) {
    console.error("❌ Error loading admin order detail:", err);
    res.status(500).send("Error loading order details.");
  }
});

router.post('/orders/:id/status', requireAdmin, async (req, res) => {
  const orderId = parseInt(req.params.id);
  const { status } = req.body;

  try {
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);
    res.redirect(`/admin/orders`);
  } catch (err) {
    console.error("❌ Error updating order status:", err);
    res.status(500).send("Could not update status.");
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin-login');
  });
});

export default router;