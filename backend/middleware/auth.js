const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforgreenbalcony123';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  }

  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, error: 'Invalid token format. Use Bearer <token>.' });
  }

  const token = tokenParts[1];

  try {
    const decoded = jwt.decode(token);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Invalid token.' });
    }

    // Check expiration (exp is in seconds)
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({ success: false, error: 'Token has expired.' });
    }
    
    // Normalize Supabase specific token fields if present
    if (decoded.user_metadata) {
      decoded.role = decoded.user_metadata.role || decoded.role;
      decoded.name = decoded.user_metadata.name;
    }
    decoded.user_id = decoded.sub || decoded.user_id;

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }
  
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ success: false, error: 'Forbidden. Admin role required.' });
  }
  
  next();
}

module.exports = {
  verifyToken,
  requireAdmin
};
