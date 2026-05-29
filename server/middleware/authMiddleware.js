// JWT verification middleware for securing Express routes
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is missing' });
  }
  
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Authorization format should be: Bearer <token>' });
  }
  
  const token = tokenParts[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretbillbookkey12345');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token is invalid or expired' });
  }
};

module.exports = authMiddleware;
