const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT) || 3306,
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'mentalhealthdb',
    
 
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});


const promisePool = pool.promise();

// Execute query helper (from admin config)
async function executeQuery(query, params = []) {
    try {
        const [rows] = await promisePool.execute(query, params);
        return { success: true, data: rows };
    } catch (error) {
        console.error('Query error:', error.message);
        return { success: false, error: error.message };
    }
}


async function testConnection() {
    try {
        const connection = await promisePool.getConnection();
        console.log('MySQL Database connected successfully!');
        console.log(` Database: ${process.env.MYSQLDATABASE || process.env.DB_NAME || 'mentalhealthdb'}`);
        console.log(`Port: ${process.env.MYSQLPORT || process.env.DB_PORT || 3306}`);
        connection.release();
        return true;
    } catch (error) {
        console.error('MySQL Database connection failed:', error.message);
        console.log('\n Troubleshooting tips:');
        console.log('1. Make sure MySQL is running');
        console.log('2. Check your .env file has correct credentials');
        console.log('3. Verify the database exists');
        console.log('4. Check if port is correct (3306 or 3308)');
        return false;
    }
}

module.exports = { 
    pool,           
    promisePool,    
    executeQuery,   
    testConnection  
};