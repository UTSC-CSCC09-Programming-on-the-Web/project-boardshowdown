export const createAttemptTable = `
    CREATE TABLE IF NOT EXISTS Attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
        question_id INTEGER NOT NULL REFERENCES Questions(id) ON DELETE CASCADE,
        is_correct BOOLEAN NOT NULL,
        score INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`;