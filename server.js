import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import session from 'express-session';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import moment from 'moment';
import Razorpay from 'razorpay';
import crypto from "crypto";
import { requireLogin } from './middleware/auth.js';
import { upload } from './middleware/upload.js'; // adjust path as needed


dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});


// Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,       // Set in .env
  key_secret: process.env.RAZORPAY_KEY_SECRET
});



app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use('uploads', express.static('uploads'));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true only if using HTTPS
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});


//Configure Nodemailer for OTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'alok.burnpur@gmail.com',
    pass: process.env.NODEMAILER_PASS
  }
});


// Sample route
app.get('/', async (req, res) => {
  try {
  

    // Categories are always needed
    const categoryResult = await pool.query('SELECT name FROM categories ORDER BY name ASC');
    const categories = categoryResult.rows;

    // If user is logged in, fetch profile picture
    if (req.session.user) {
      const userId = req.session.user.id;
      const profileResult = await pool.query(
        'SELECT profile_picture_url FROM user_profiles WHERE user_id = $1',
        [userId]
      );
      const profile = profileResult.rows[0];
      const user = {
        profile_picture: profile?.profile_picture_url || '', 
      }
      res.render('home', {
        user,
        categories
      });
    } else {
      res.render('home', {
        user: req.session.user,
        categories
      });
    }

    
  } catch (err) {
    console.error("Error loading home:", err);
    res.status(500).send("Internal Server Error");
  }
});


app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    const products = result.rows;

    res.render('products', { products }); // ✅ Pass products to EJS
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).send('Error loading products.');
  }
});

app.get('/products/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).send('Product not found');
    }

    const product = result.rows[0];

    // Fetch 3 related products from same category (excluding current)
    const relatedResult = await pool.query(
      'SELECT * FROM products WHERE category = $1 AND id != $2 LIMIT 3',
      [product.category, id]
    );

    const relatedProducts = relatedResult.rows;

    res.render('productDetail', { product, relatedProducts });

  } catch (err) {
    console.error("❌ Error fetching product:", err);
    res.status(500).send("Error loading product details.");
  }
});

app.get('/cart', requireLogin, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const result = await pool.query(`
      SELECT ci.*, p.name, p.price, p.image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
    `, [userId]);

    const cartItems = result.rows;

    const totalPrice = cartItems.reduce((sum, item) =>
      sum + item.price * item.quantity, 0
    );

    res.render('cart', { cartItems, totalPrice });

  } catch (err) {
    console.error("❌ Error loading cart:", err);
    res.status(500).send("Could not load cart");
  }
});

app.post('/cart/add/:id', requireLogin, upload.single('customImage'), async (req, res) => {
  const userId = req.session.user.id;
  const productId = parseInt(req.params.id);
  const {
    quantity,
    customText,
    whatsapp,
    default: useDefaultCheckbox // note: 'default' is a reserved word in JS
  } = req.body;

  const use_default = useDefaultCheckbox === 'on';
  const customization_text = use_default ? null : customText || null;
  const whatsapp_number = use_default ? null : whatsapp || null;
  const image_path = use_default || !req.file ? null : `/uploads/${req.file.filename}`;

  try {
    await pool.query(
      `INSERT INTO cart_items 
        (user_id, product_id, quantity, customization_text, image_path, whatsapp, use_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, productId, quantity || 1, customization_text, image_path, whatsapp_number, use_default]
    );

    res.redirect('/cart');
  } catch (err) {
    console.error("❌ Error adding to cart:", err);
    res.status(500).send("Something went wrong while adding to cart");
  }
});

app.post('/cart/update/:id', requireLogin, async (req, res) => {
  const cartItemId = parseInt(req.params.id);
  const userId = req.session.user.id;
  const action = req.body.action;

  try {
    // Fetch current quantity
    const result = await pool.query(
      'SELECT quantity FROM cart_items WHERE id = $1 AND user_id = $2',
      [cartItemId, userId]
    );

    if (result.rows.length === 0) return res.redirect('/cart');

    let currentQty = result.rows[0].quantity;

    if (action === 'increase') {
      currentQty++;
    } else if (action === 'decrease' && currentQty > 1) {
      currentQty--;
    }

    await pool.query(
      'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3',
      [currentQty, cartItemId, userId]
    );

    res.redirect('/cart');
  } catch (err) {
    console.error("❌ Error updating quantity:", err);
    res.status(500).send("Failed to update cart item.");
  }
});


app.post('/cart/remove/:id', requireLogin, async (req, res) => {
  const cartItemId = parseInt(req.params.id);
  const userId = req.session.user.id;

  try {
    await pool.query(
      'DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
      [cartItemId, userId]
    );

    res.redirect('/cart');
  } catch (err) {
    console.error("❌ Error removing item from cart:", err);
    res.status(500).send("Failed to remove cart item.");
  }
});

// Buy Now 
app.post('/buy-now/customize', requireLogin, upload.single('customImage'), async (req, res) => {
  const {
    product_id,
    quantity,
    customization_text,
    use_default,
    whatsapp,
    actionType
  } = req.body;
  console.log("productId: ", product_id);
  console.log("ProductId: ", parseInt(product_id));
 
  const image_path = req.file ? `/uploads/${req.file.filename}` : null;

  if (actionType === 'buy-now') {
    // Save item in session (only 1 item for buy now)
    req.session.buyNowItem = {
      product_id: parseInt(product_id),
      quantity: parseInt(quantity),
      customization_text: customization_text || null,
      image_path,
      whatsapp: whatsapp || null,
      use_default: use_default === 'on'
    };
    res.redirect('/checkout');
  } else {
    // 
    // push into cart_items table 
    res.redirect('/cart'); 
  }
});

// Route: GET /checkout/:productId
app.get('/checkout', requireLogin, async (req, res) => {
  const userId = req.session.user.id;
  const addresses = await pool.query(`SELECT * FROM user_addresses WHERE user_id = $1`, [userId]);
  
  if (req.session.buyNowItem) {
    const item = req.session.buyNowItem;
    const productRes = await pool.query(`SELECT * FROM products WHERE id = $1`, [item.product_id]);
    const product = productRes.rows[0];

    const total = parseFloat(product.price) * item.quantity;
    console.log("custom-text: ", item.customization_text);
    console.log("whatsapp:", item.whatsapp);
    console.log("use_Def:", item.use_default);
    console.log("img_path:", item.image_path);
    return res.render('checkout', {
      addresses: addresses.rows,
      isBuyNow: true,
      cartItems: [{
        ...item,  // contain details of object buyNowItems
        product_name: product.name,
        price: parseFloat(product.price),
        image_url: product.image_url,
        product_id: item.product_id
      }],
      totalPrice: total
    });
  }
  try {
    // Fetch cart items
    const cartResult = await pool.query(`
      SELECT ci.*, p.name, p.price, p.image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = $1
    `, [userId]);

    const cartItems = cartResult.rows;

    if (cartItems.length === 0) return res.redirect('/cart');

    // Fetch saved addresses
    const addressResult = await pool.query(
      'SELECT * FROM user_addresses WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    const addresses = addressResult.rows;

    // Total amount
    const totalPrice = cartItems.reduce((sum, item) =>
      sum + item.price * item.quantity, 0
    );

    res.render('checkout', { cartItems, addresses, totalPrice, isBuyNow: false });

  } catch (err) {
    console.error("❌ Checkout error:", err);
    res.status(500).send("Failed to load checkout page.");
  }
});

// create order
app.post('/create-order', requireLogin, async (req, res) => {
  const userId = req.session.user.id;

  try {
    let totalAmount = 0;

    if (req.session.buyNowItem) {
      const productRes = await pool.query('SELECT price FROM products WHERE id = $1', [req.session.buyNowItem.product_id]);
      const price = parseFloat(productRes.rows[0].price);
      totalAmount = price * req.session.buyNowItem.quantity;
    } else {
      const cartRes = await pool.query('SELECT product_id, quantity FROM cart_items WHERE user_id = $1', [userId]);
      const cartItems = cartRes.rows;

      const productIds = cartItems.map(i => i.product_id);
      const productsRes = await pool.query(`SELECT id, price FROM products WHERE id = ANY($1)`, [productIds]);
      const priceMap = {};
      productsRes.rows.forEach(p => priceMap[p.id] = parseFloat(p.price));

      totalAmount = cartItems.reduce((sum, item) => sum + priceMap[item.product_id] * item.quantity, 0);
    }

    const amountInPaise = totalAmount * 100;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      keyId: process.env.RAZORPAY_KEY_ID,
    });

  } catch (err) {
    console.error("Error in /create-order:", err);
    res.status(500).json({ error: 'Failed to create Razorpay order' });
  }
});

// Order place
app.post('/place-order', requireLogin, async (req, res) => {
  const userId = req.session.user.id;
  const addressId = parseInt(req.body.address_id);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  try {
    // ✅ 1. Verify Razorpay Signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).send("Payment verification failed");
    }

    // ✅ 2. Determine Order Type (Buy Now or Cart)
    let orderItems = [];
    let totalAmount = 0;

    if (req.session.buyNowItem && Object.keys(req.session.buyNowItem).length > 0) {
      const item = req.session.buyNowItem;

      const productRes = await pool.query('SELECT price FROM products WHERE id = $1', [item.product_id]);
      const price = parseFloat(productRes.rows[0].price);

      totalAmount = price * item.quantity;
      orderItems.push({ ...item, price });

    } else {
      const cartRes = await pool.query(
        'SELECT * FROM cart_items WHERE user_id = $1',
        [userId]
      );
      const cartItems = cartRes.rows;

      const productIds = cartItems.map(i => i.product_id);
      const productRes = await pool.query('SELECT id, price FROM products WHERE id = ANY($1)', [productIds]);

      const priceMap = {};
      productRes.rows.forEach(p => priceMap[p.id] = parseFloat(p.price));

      totalAmount = cartItems.reduce((sum, item) => sum + priceMap[item.product_id] * item.quantity, 0);

      orderItems = cartItems.map(item => ({
        ...item,
        price: priceMap[item.product_id]
      }));
    }

    // ✅ 3. Insert Order
    const orderRes = await pool.query(
      `INSERT INTO orders (user_id, address_id, total_amount, razorpay_payment_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [userId, addressId, totalAmount, razorpay_payment_id]
    );

    const orderId = orderRes.rows[0].id;

    // ✅ 4. Insert Order Items
    const insertPromises = orderItems.map(item => {
      return pool.query(`
        INSERT INTO order_items
        (order_id, product_id, quantity, customization_text, image_path, whatsapp, use_default)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        orderId,
        item.product_id,
        item.quantity,
        item.customization_text || null,
        item.image_path || null,
        item.whatsapp || null,
        item.use_default
      ]);
    });

    await Promise.all(insertPromises);

    // ✅ 5. Clear cart or session
    if (req.session.buyNowItem) {
      delete req.session.buyNowItem;
    } else {
      await pool.query(`DELETE FROM cart_items WHERE user_id = $1`, [userId]);
    }

    // ✅ 6. Redirect to Order Success
    res.redirect(`/order-success/${orderId}`);

  } catch (err) {
    console.error("❌ Error placing order after payment:", err);
    res.status(500).send("Something went wrong while placing your order.");
  }
});

app.get('/order-success/:id', requireLogin, async (req, res) => {
  const orderId = parseInt(req.params.id);
  const userId = req.session.user.id;

  try {
    const orderRes = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );

    if (orderRes.rows.length === 0) return res.status(404).send("Order not found");

    res.render('orderSuccess', { order: orderRes.rows[0] });

  } catch (err) {
    console.error("❌ Error loading order success page:", err);
    res.status(500).send("Something went wrong.");
  }
});



//----------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------

// User Sign Up
// Render signup form
app.get('/signup', (req, res) => {
  res.render('signup');
});

// OTP generator
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
// send otp function
async function sendOtpEmail(email, otp) {
  if (!email) throw new Error("Recipient email is undefined");

  return transporter.sendMail({
    from: '"CarveLane" alok.burnpur@gmail.com',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}. It is valid for only 1 minute 30 seconds.`,
  });
}

// Send OTP API
app.post('/send-otp', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email required' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User already exists. Please login or use a different email.',
      });
    }

    // Generate OTP and store in session
    const otp = generateOTP();
    req.session.otp = otp;
    req.session.otpName = name;
    req.session.otpEmail = email;
    req.session.otpExpiry = Date.now() + 90 * 1000;

    // Send email
    await sendOtpEmail(email, otp);
    console.log(`📧 OTP sent to ${email}: ${otp}`);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Error in /send-otp:", err);
    return res.status(500).json({ success: false, message: "Server error while sending OTP" });
  }
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  if (!req.session.otp || !req.session.otpEmail || !req.session.otpExpiry) {
    return res.json({ success: false, message: 'OTP session expired. Please resend OTP.' });
  }

  if (Date.now() > req.session.otpExpiry) {
    return res.json({ success: false, message: 'OTP expired. Please resend OTP.' });
  }

  if (req.session.otp !== otp || req.session.otpEmail !== email) {
    return res.json({ success: false, message: 'Invalid OTP. Please try again.' });
  }

  // Valid OTP, clear session values except email for next step
  req.session.otpVerified = true;
  console.log(`✅ OTP verified for ${email}`);
  res.json({ success: true });
});



// Handle signup form submission
app.post('/signup', async (req, res) => {
  const { password, confirmPassword } = req.body;
  const email = req.session.otpEmail;
  const name = req.session.otpName;

  // 🚫 Basic checks
  if (!name || !email) {
    return res.json({ 
      success: false, 
      message: 'Session expired. Please start signup again.' 
    });
  }
  // 🧪 Check OTP verified
  if (!password || !confirmPassword || password !== confirmPassword) {
    return res.json({ 
      success: false, 
      message: 'Passwords do not match.' 
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
      [name, email, hashedPassword]
    );

    // 🔐 Clear session
    req.session.otp = null;
    req.session.otpEmail = null;
    req.session.otpVerified = null;

    return res.json({ 
        success: true,
        message: 'Account created successfully!'
    });
  } catch (err) {
    console.error('❌ Signup error:', err);
    
    let errorMessage = 'Signup failed. Please try again.';
    if (err.code === '23505') { // Unique violation error code
        errorMessage = 'Email already exists. Please use a different email.';
    }

    return res.status(500).json({ 
        success: false, 
        message: errorMessage 
    });
  }
});


// Render login form
app.get('/login', (req, res) => {
  res.render('login');
});

// Handle login submission
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).send("No user found with that email.");
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).send("Incorrect password.");
    }

    // Save user in session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    res.redirect('/');
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Login failed");
  }
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Logout failed");
    }
    res.redirect('/');
  });
});

// Profile
app.get('/profile', requireLogin, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const userInfo = user.rows[0];

    const addressRes = await pool.query('SELECT * FROM user_addresses WHERE user_id = $1', [userId]);
    const addresses = addressRes.rows;

    const orderRes = await pool.query(`
      SELECT 
        o.*,
        JSON_AGG(
          to_jsonb(oi) - 'order_id' ||  
          jsonb_build_object(
            'image_url', p.image_url,
            'use_default', oi.use_default  
          )
        ) AS items
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = $1
      GROUP BY o.id, oi.id, p.image_url  -- Must include all non-aggregated columns
      ORDER BY o.created_at DESC
  `, [userId]);

    // Parse JSON items
    const orders = orderRes.rows.map(order => ({
      ...order,
      items: order.items || []
    }));

    res.render('profile', { user: userInfo, addresses, orders });

  } catch (err) {
    console.error("❌ Profile load error:", err);
    res.status(500).send("Failed to load profile");
  }
});

// POST /profile/update
app.post("/profile/address/add", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: "Unauthorized" });

  const userId = req.session.user.id;
  const {
    address_type, full_name, address_line1, address_line2,
    city, state, postal_code, country
  } = req.body;

  try {
    const query = `
      INSERT INTO user_addresses (
        user_id, address_type, full_name, address_line1, address_line2,
        city, state, postal_code, country
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *;
    `;
    const values = [
      userId, address_type, full_name, address_line1, address_line2 || null,
      city, state, postal_code, country
    ];

    const result = await pool.query(query, values);
    res.status(201).json({ success: true, address: result.rows[0] });

  } catch (err) {
    console.error("Add address error:", err);
    res.status(500).json({ success: false, message: "Failed to add address" });
  }
});


app.put("/profile/address/edit/:id", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: "Unauthorized" });

  const addressId = req.params.id;
  const userId = req.session.user.id;

  const {
    address_type, full_name, address_line1, address_line2,
    city, state, postal_code, country
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE user_addresses SET
        address_type = $1, full_name = $2, address_line1 = $3, address_line2 = $4,
        city = $5, state = $6, postal_code = $7, country = $8, updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND user_id = $10 RETURNING *`,
      [
        address_type, full_name, address_line1, address_line2 || null,
        city, state, postal_code, country, addressId, userId
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    res.json({ success: true, address: result.rows[0] });
  } catch (err) {
    console.error("Edit address error:", err);
    res.status(500).json({ success: false, message: "Failed to update address" });
  }
});

app.delete("/profile/address/delete/:id", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: "Unauthorized" });

  const addressId = req.params.id;
  const userId = req.session.user.id;

  try {
    const result = await pool.query(
      `DELETE FROM user_addresses WHERE id = $1 AND user_id = $2 RETURNING *`,
      [addressId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Address not found or unauthorized" });
    }

    res.json({ success: true, message: "Address deleted" });
  } catch (err) {
    console.error("Delete address error:", err);
    res.status(500).json({ success: false, message: "Failed to delete address" });
  }
});


app.patch("/profile/address/set-default/:id", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: "Unauthorized" });

  const addressId = req.params.id;
  const userId = req.session.user.id;

  try {
    // Unset previous default
    await pool.query(
      `UPDATE user_addresses SET is_default = false WHERE user_id = $1`,
      [userId]
    );

    // Set new default
    const result = await pool.query(
      `UPDATE user_addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [addressId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Address not found" });
    }

    res.json({ success: true, message: "Default address updated", address: result.rows[0] });

  } catch (err) {
    console.error("Set default address error:", err);
    res.status(500).json({ success: false, message: "Failed to set default address" });
  }
});


app.post("/profile/address", async (req, res) => {
  if (!req.session.user) return res.status(401).json({ success: false, message: "Unauthorized" });

  const userId = req.session.user.id;
  const {
    id,
    address_type,
    full_name,
    address_line1,
    address_line2,
    city,
    state,
    postal_code,
    country,
    is_default
  } = req.body;

  try {
    if (id) {
      // 🔁 UPDATE address
      await pool.query(
        `UPDATE user_addresses SET
          address_type = $1, full_name = $2, address_line1 = $3, address_line2 = $4,
          city = $5, state = $6, postal_code = $7, country = $8, is_default = $9, updated_at = CURRENT_TIMESTAMP
         WHERE id = $10 AND user_id = $11`,
        [address_type, full_name, address_line1, address_line2, city, state, postal_code, country, is_default, id, userId]
      );
    } else {
      // ➕ INSERT new address
      await pool.query(
        `INSERT INTO user_addresses
          (user_id, address_type, full_name, address_line1, address_line2, city, state, postal_code, country, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [userId, address_type, full_name, address_line1, address_line2, city, state, postal_code, country, is_default]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Address save failed:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});



app.get('/download-invoice/:id', requireLogin, async (req, res) => {
  const orderId = parseInt(req.params.id);
  const userId = req.session.user.id;

  try {
    // Fetch order
    const orderRes = await pool.query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );

    if (orderRes.rows.length === 0) return res.status(404).send('Order not found');
    const order = orderRes.rows[0];

    // Fetch order items with product names
    const itemsRes = await pool.query(`
      SELECT oi.*, p.name AS product_name, p.price
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);

    const items = itemsRes.rows;

    // Generate PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const filename = `Invoice_CarveLane_Order_${orderId}.pdf`;

    // Set response headers
    res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-type', 'application/pdf');
    doc.pipe(res);

    // Header Section
    const headerY = 50;
    doc.fontSize(20).text('CarveLane', { align: 'center', y: headerY });
    doc.fontSize(16).text('INVOICE', { align: 'center', y: headerY + 30 });
    
    // Draw header line
    doc.moveTo(50, headerY + 60)
      .lineTo(550, headerY + 60)
      .lineWidth(1)
      .stroke();

    // Order Info Section - Two Columns
    const infoY = headerY + 80;
    doc.fontSize(10)
      .text('Invoice Number:', 50, infoY)
      .text(`#${order.id}`, 150, infoY)
      .text('Date:', 350, infoY)
      .text(new Date(order.created_at).toLocaleDateString(), 400, infoY)
      
      .text('Customer:', 50, infoY + 20)
      .text(`${req.session.user.name}`, 150, infoY + 20)
      .text('Status:', 350, infoY + 20)
      .text(order.status, 400, infoY + 20)
      
      .text('Email:', 50, infoY + 40)
      .text(req.session.user.email, 150, infoY + 40)
      .text('Order Date:', 350, infoY + 40)
      .text(new Date(order.created_at).toLocaleString(), 400, infoY + 40);

    // Items Table Header
    const tableHeaderY = infoY + 80;
    doc.fontSize(12).fillColor('#555555')
      .text('#', 50, tableHeaderY, { width: 30 })
      .text('Product', 90, tableHeaderY, { width: 240 })
      .text('Qty', 330, tableHeaderY, { width: 50, align: 'right' })
      .text('Unit Price', 380, tableHeaderY, { width: 80, align: 'right' })
      .text('Amount', 460, tableHeaderY, { width: 80, align: 'right' })
      .fillColor('black');

    // Draw table header line
    doc.moveTo(50, tableHeaderY + 20)
      .lineTo(550, tableHeaderY + 20)
      .stroke();

    // Items Rows
    let currentY = tableHeaderY + 30;
    let total = 0;
    let counter = 1;

    items.forEach(item => {
      const unit_price = Number(item.price);
      const quantity = Number(item.quantity);
      const subtotal = unit_price * quantity;
      total += subtotal;

      // Draw all columns at the same Y position
      doc.fontSize(10)
        .text(counter.toString(), 50, currentY, { width: 30 })
        .text(item.product_name, 90, currentY, { width: 240 })
        .text(quantity.toString(), 330, currentY, { width: 50, align: 'right' })
        .text(`₹${unit_price.toFixed(2)}`, 380, currentY, { width: 80, align: 'right' })
        .text(`₹${subtotal.toFixed(2)}`, 460, currentY, { width: 80, align: 'right' });

      // Add customization text if exists
      if (!item.use_default && item.customization_text) {
        doc.fontSize(8).fillColor('#666666')
          .text(`Custom: ${item.customization_text}`, 90, currentY + 15, { width: 400 })
          .fillColor('black');
        currentY += 20; // Extra space for customization
      } else {
        currentY += 15; // Normal row height
      }

      counter++;
    });

    // Draw footer line
    doc.moveTo(50, currentY)
      .lineTo(550, currentY)
      .stroke();
    currentY += 20;

    // Totals Section
    doc.fontSize(12)
      .text('Subtotal:', 380, currentY, { width: 80, align: 'right' })
      .text(`₹${total.toFixed(2)}`, 460, currentY, { width: 80, align: 'right' });
    currentY += 20;

    doc.fontSize(13)
      .text('Total:', 380, currentY, { width: 80, align: 'right', underline: true })
      .text(`₹${total.toFixed(2)}`, 460, currentY, { width: 80, align: 'right', underline: true });
    currentY += 40;

    // Footer Note
    doc.fontSize(10).fillColor('#777777')
      .text('Thank you for shopping with CarveLane!', { align: 'center', y: currentY })
      .text('For any questions, contact: support@carvelane.com', { align: 'center', y: currentY + 15 })
      .text('CarveLane by S.K. Art', { align: 'center', y: currentY + 30 });

    doc.end();

  } catch (err) {
    console.error("❌ Error generating invoice:", err);
    res.status(500).send("Could not generate invoice.");
  }
});
// ---------------------------------------------------------------------------------------------------------------





// Admin Login form
app.get('/admin-login', (req, res) => {
  res.render('admin-login', { error: null });
});

// Handle login form
app.post('/admin/login', (req, res) => {
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

app.get('/admin', requireAdmin, (req, res) => {
  res.render('admin', { user: req.session.user });
});

// Render add product form
app.get('/admin/add-product', requireAdmin, async(req, res) => {
  const result = await pool.query('SELECT name FROM categories ORDER BY name ASC');
  res.render('addProduct', {categories: result.rows});
});

// Handle product form submission
app.post('/admin/add-product', requireAdmin, upload.single('image'), async (req, res) => {
  const { name, price, description, category, customCategory } = req.body;
  const imageFile = req.file;

  if(!name || !price || !description || !imageFile) {
    return res.status(400).send("MIssing fields");
  }

  const image_url = '/uploads/' + imageFile.filename;
  const finalCategory = category === '__custom__'? customCategory : category;
  // Ensure new category gets saved to DB
  if (category === '__custom__' && customCategory) {
    await pool.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [customCategory]);
  }

  try {
    await pool.query(
      'INSERT INTO products (name, price, description, image_url, category) VALUES ($1, $2, $3, $4, $5)',
      [name, price, description, image_url, finalCategory]
    );

    res.redirect('/admin/products');
  } catch (err) {
    console.error("❌ Error adding product:", err);
    res.status(500).send("Failed to add product");
  }
});

// View Products in Admin
app.get('/admin/products', requireAdmin, async (req, res) => {
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
app.get('/admin/edit-product/:id', requireAdmin, async (req, res) => {
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

app.post('/admin/edit-product/:id', requireAdmin, upload.single('image'), async (req, res) => {
  const productId = req.params.id;
  const { name, price, description, category, customCategory,  } = req.body;
  const imageFile = req.file;

  const finalCategory = category === '__custom__' ? customCategory : category;
  // Ensure new category gets saved to DB
  if (category === '__custom__' && customCategory) {
    await pool.query('INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING', [customCategory]);
  }
  try {
    let image_url = req.body.currentImage;
    if (imageFile) {
      image_url = '/uploads/' + imageFile.filename;
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
app.post('/admin/delete-product/:id', requireAdmin, async (req, res) => {
  const productId = req.params.id;

  try {
    await pool.query('DELETE FROM products WHERE id = $1', [productId]);
    res.redirect('/admin/products');
  } catch (err) {
    console.error("❌ Error deleting product:", err);
    res.status(500).send("Failed to delete product");
  }
});

app.get('/admin/orders', requireAdmin, async (req, res) => {
  try {
    const ordersRes = await pool.query(`
      SELECT o.*, u.name AS customer_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);

    res.render('admin/orders', {
      orders: ordersRes.rows
    });
  } catch (err) {
    console.error("❌ Error fetching admin orders:", err);
    res.status(500).send("Failed to load admin orders.");
  }
});

app.get('/admin/orders/:id', requireAdmin, async (req, res) => {
  const orderId = parseInt(req.params.id);

  try {
    // Fetch order with customer name and shipping address
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

    // Format address for easier EJS rendering
    order.address = {
      full_name: order.full_name,
      address_line1: order.address_line1,
      address_line2: order.address_line2,
      city: order.city,
      state: order.state,
      postal_code: order.postal_code,
      country: order.country,
    };

    // Fetch order items
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

app.post('/admin/orders/:id/status', requireAdmin, async (req, res) => {
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



app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin-login');
  });
});


app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
