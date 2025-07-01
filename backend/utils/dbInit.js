import { client } from '../datasource.js';
import { createQuestionBankquery } from '../models/questionBank.js';
import { createUserTableQuery } from '../models/users.js';

export const initializeDatabase = async () => {
  try {
    console.log('Initializing database tables...');
    
    // Array of all table creation queries
    const tableQueries = [
      { name: 'Questions', query: createQuestionBankquery },
      { name: 'Users', query: createUserTableQuery }
    ];
    
    // Execute each table creation query
    for (const table of tableQueries) {
      try {
        await client.query(table.query);
        console.log(`Table '${table.name}' created/verified successfully`);
      } catch (error) {
        console.error(`Error creating table '${table.name}':`, error.message);
        throw error;
      }
    }
    
    console.log('Database initialization completed successfully!');
    
    // Optional: Insert sample data if tables are empty
    await insertSampleData();
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

const insertSampleData = async () => {
  try {
    // Check if Questions table has data
    const questionsCount = await client.query('SELECT COUNT(*) FROM Questions');
    const count = parseInt(questionsCount.rows[0].count);
    
    if (count === 0) {
      console.log('Inserting sample questions...');
      
      const sampleQuestions = [
        { questions: 'What is 2 + 2?', solutions: 4 },
        { questions: 'What is the square root of 16?', solutions: 4 },
        { questions: 'What is 10 divided by 2?', solutions: 5 },
        { questions: 'What is 3 × 7?', solutions: 21 },
        { questions: 'What is 15 - 8?', solutions: 7 }
      ];
      
      for (const question of sampleQuestions) {
        await client.query(
          'INSERT INTO Questions (questions, solutions) VALUES ($1, $2)',
          [question.questions, question.solutions]
        );
      }
      
      console.log(`Inserted ${sampleQuestions.length} sample questions`);
    } else {
      console.log(`Questions table already contains ${count} records`);
    }
    
  } catch (error) {
    console.error('Error inserting sample data:', error.message);
    // Don't throw here - sample data is optional
  }
};
