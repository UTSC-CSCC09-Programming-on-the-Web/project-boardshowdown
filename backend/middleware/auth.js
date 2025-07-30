// Authentication middleware for protecting API endpoints
export const requireAuth = (req, res, next) => {
  // Check if user is authenticated via session
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this endpoint'
    });
  }
  
  // User is authenticated, proceed to next middleware/route handler
  next();
};

// More strict authentication that also checks for valid tokens
export const requireAuthWithTokens = (req, res, next) => {
  // Check if user has both session user data and valid tokens
  if (!req.session || !req.session.user || !req.session.tokens || !req.session.tokens.access_token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please log in to access this endpoint'
    });
  }
  
  // User is authenticated with valid tokens, proceed
  next();
};