// Model for user table
export const createUserTableQuery = `
    CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        username VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        profile_picture VARCHAR(255),
        stripe_customer_id VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'inactive'
    );
`;
