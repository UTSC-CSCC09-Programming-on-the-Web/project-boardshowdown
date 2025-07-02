import { client } from "../datasource.js";
import { createUserTableQuery } from "../models/users.js";
import { createQuestionBankquery } from "../models/questionBank.js";

export async function initializeDatabase() {
  try {
    console.log("Initializing database...");

    // Create Users table
    await client.query(createUserTableQuery);
    console.log("Users table created/verified");

    // Create Questions table
    await client.query(createQuestionBankquery);
    console.log("Questions table created/verified");

    // Check if questions table has data
    const questionsCount = await client.query("SELECT COUNT(*) FROM Questions");
    const count = parseInt(questionsCount.rows[0].count);

    if (count === 0) {
      console.log("No questions found, inserting sample questions...");
      await insertSampleQuestions();
    } else {
      console.log(`Found ${count} questions in database`);
    }

    console.log("Database initialization completed successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

async function insertSampleQuestions() {
  const sampleQuestions = [
    {
      question: "What is 2 + 2?",
      solution: 4
    },
    {
      question: "Calculate the derivative of x²",
      solution: 0 // Placeholder for text solutions
    },
    {
      question: "If a stock costs $100 and increases by 5%, what is the new price?",
      solution: 105
    },
    {
      question: "What is the area of a circle with radius 3? (Use π ≈ 3.14)",
      solution: 28.26
    },
    {
      question: "Solve for x: 2x + 5 = 15",
      solution: 5
    },
    {
      question: "What is the compound interest on $1000 at 10% annual rate for 2 years?",
      solution: 210
    },
    {
      question: "Calculate: 7 × 8",
      solution: 56
    },
    {
      question: "What is the square root of 64?",
      solution: 8
    },
    {
      question: "If you invest $500 at 6% simple interest for 3 years, what is the total amount?",
      solution: 590
    },
    {
      question: "What is 25% of 80?",
      solution: 20
    }
  ];

  for (const q of sampleQuestions) {
    try {
      await client.query(
        "INSERT INTO Questions (questions, solutions) VALUES ($1, $2)",
        [q.question, q.solution]
      );
    } catch (error) {
      console.error(`Error inserting question: ${q.question}`, error);
    }
  }

  console.log(`Inserted ${sampleQuestions.length} sample questions`);
}