
import mysql from 'mysql2/promise';

// This function creates a connection pool. It's more efficient than creating a new connection for every query.
const createPool = () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        console.log("Successfully created MySQL connection pool.");
        return pool;
    } catch (error) {
        console.error("Failed to create MySQL connection pool:", error);
        throw error;
    }
};

// We only want to create the pool once.
export const pool = process.env.DB_HOST ? createPool() : null;

/**
 * Executes a SQL query.
 * @param query The SQL query string.
 * @param params An array of parameters to be safely substituted into the query.
 * @returns The query results.
 */
export const executeQuery = async (query: string, params: any[] = []) => {
    if (!pool) {
        throw new Error("Database is not configured. Please set the database environment variables.");
    }
    
    let connection;
    try {
        console.log(`Executing query: ${query} with params: ${JSON.stringify(params)}`);
        connection = await pool.getConnection();
        const [results] = await connection.execute(query, params);
        console.log("Query executed successfully.");
        return results;
    } catch (error) {
        console.error("SQL Error:", error);
        throw new Error("Failed to execute database query.");
    } finally {
        if (connection) {
            connection.release();
            console.log("Database connection released.");
        }
    }
};
