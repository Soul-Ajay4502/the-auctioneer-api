require("dotenv").config();

const mysql = require("mysql2");
function connection() {
    try {
        const pool = mysql.createPool({
            // connectionLimit: 1000,
            host: process.env.DB_HOST,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            // charset:'utf8mb4',
            // timezone: 'utc',
            connectionLimit: 100,
            waitForConnections: true,
            // queueLimit: 0,
            debug: false,
            timezone: "+00:00", // Interpret all received timestamps as UTC. Otherwise local timezone is assumed.
            dateStrings: [
                "DATE", // DATE's are returned as strings (otherwise they would be interpreted as YYYY-MM-DD 00:00:00+00:00)
                "DATETIME", // DATETIME's return as strings (otherwise they would interpreted as YYYY-MM-DD HH:mm:ss+00:00)
            ],
        });
        return pool.promise();
    } catch (error) {
        return console.log(`Could not connect - ${error}`);
    }
}

const pool = connection();

module.exports = {
    connection: async () => pool.getConnection(),
    execute: (...params) => pool.execute(...params),
    query: (...params) => pool.query(...params),
};
