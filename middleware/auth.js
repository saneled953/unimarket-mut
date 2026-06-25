// middleware/auth.js - Authentication middleware

// Protect routes that require login
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login?msg=Please log in to continue');
  }
  next();
};

// Redirect logged-in users away from auth pages
const redirectIfLoggedIn = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
};

module.exports = { requireLogin, redirectIfLoggedIn };
