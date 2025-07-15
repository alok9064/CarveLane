// middleware/auth.js
export function requireLogin(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login'); // or show modal if you prefer
}
