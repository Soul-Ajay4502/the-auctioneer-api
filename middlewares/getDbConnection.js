const db = require('../config/db');

const getDbConnection = async (req, res, next) => {
    try {
        req.conn = await db.connection();
        next();
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = getDbConnection;
