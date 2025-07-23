// Model for user table
export const createUserTableQuery = `
    CREATE TABLE IF NOT EXISTS Users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        stripe_customer_id VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'inactive'
    );
`;
