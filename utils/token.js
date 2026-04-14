const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

module.exports = {
    signToken(payload, options = { expiresIn: '30d' }) {
        return jwt.sign(payload, JWT_SECRET, options);
    },
    verifyToken(token) {
        return jwt.verify(token, JWT_SECRET);
    }
};