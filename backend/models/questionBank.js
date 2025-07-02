export const createQuestionBankquery = `
    CREATE TABLE IF NOT EXISTS Questions (
        id SERIAL PRIMARY KEY,
        questions TEXT NOT NULL,
        solutions REAL NOT NULL
    );`;