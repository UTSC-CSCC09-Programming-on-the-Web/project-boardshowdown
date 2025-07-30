import { client } from "../datasource.js";
import { createUserTableQuery } from "../models/users.js";
import { createQuestionBankquery } from "../models/questionBank.js";
import { createAttemptTable } from "../models/attempt.js";
import { createRoomParticipantsTable, createRoomParticipantsIndexes } from "../models/roomParticipants.js";
import { createRoomsTable, createRoomsIndexes } from "../models/rooms.js";

export async function initializeDatabase() {
  try {
    console.log("Initializing database...");

    // Create Users table
    await client.query(createUserTableQuery);
    console.log("Users table created/verified");

    // Create Questions table
    await client.query(createQuestionBankquery);
    console.log("Questions table created/verified");

    // Add difficulty column if it doesn't exist (for existing databases)
    try {
      await client.query("ALTER TABLE Questions ADD COLUMN IF NOT EXISTS difficulty INTEGER NOT NULL DEFAULT 100");
      console.log("Difficulty column added/verified");
    } catch (error) {
      console.log("Difficulty column already exists or error:", error.message);
    }

    // Create Attempts table
    await client.query(createAttemptTable);
    console.log("Attempts table created/verified");

    // Create Room Participants table
    await client.query(createRoomParticipantsTable);
    console.log("Room participants table created/verified");

    // Create indexes for room participants
    await client.query(createRoomParticipantsIndexes);
    console.log("Room participants indexes created/verified");

    // Create Rooms table
    await client.query(createRoomsTable);
    console.log("Rooms table created/verified");

    // Create indexes for rooms
    await client.query(createRoomsIndexes);
    console.log("Rooms indexes created/verified");

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
      solution: 4,
      difficulty: 100
    },
    {
      question: "Suppose you roll a fair 6-sided die until you've seen all 6 faces. What is the probability you won't see an odd numbered face until you have seen all even numbered faces?",
      solution: 0.05,
      difficulty: 100
    },
    {
      question: "A baby is learning to walk with the assistance of its living room furniture. If the baby is at the couch 33% of the time, what proportion of the time would the baby be at the couch?",
      solution: 0.333,
      difficulty: 100
    },
    {
      question: "Dan rolls a dice until he gets a 6. Given that he did not see a 5, what is the expected number of times Dan rolled his die?",
      solution: 3,
      difficulty: 100
    },
    {
      question: "Assume you are given a stick that is 1 meter in length. Randomly select 2 points on the stick and break it at these 2 points to get 3 pieces. What's the probability that the smallest piece is at most 0.2 meter?",
      solution: 0.84,
      difficulty: 100
    },
    {
      question: "You roll two dice and select the one with the highest roll. What is the expected value of the die you selected?",
      solution: 4.472,
      difficulty: 100
    },
    {
      question: "We have 4 positive integers A, B, C, and D. We know AB = 16, BC = 14, and CD = 63. What is A + B + C + D?",
      solution: 26,
      difficulty: 100
    },
    {
      question: "Suppose you flip a fair coin 1,000 times. What is the probability you observe an odd number of heads?",
      solution: 0.5,
      difficulty: 100
    },
    {
      question: "Alice and Bob each have a coin and flip it until they get a heads. If Bob flipped his coin more times than Alice, what is the expected number of times Alice flipped her coin?",
      solution: 1.333,
      difficulty: 100
    },
    {
      question: "An electronic safe has a three-digit code. You are given two hints regarding the code to the safe: None of the digits are zero, and the sum of the digits does not exceed ten. How many possible three-digit entries satisfy these two requirements?",
      solution: 120,
      difficulty: 100
    },
    {
      question: "There are five boxes: one with $150, the rest are empty. At any time, you may pay X dollars to open one of the boxes and keep the contents. Assuming you continue paying until you find the box with the money, what is the value X (in dollars) that makes the game fair?",
      solution: 50,
      difficulty: 100
    },
    {
      question: "You have a pet cat that has a sly tendency to leave your house while you are away. Every day while you are out, you call your neighbor to ask them whether your cat has left your house. Your neighbor always responds with a yes or a no, but sometimes they lie, saying that your cat left when it has not, or vice versa. Let's say that the probability that your cat leaves the house is 0.001 and the probability that your neighbor lies is 0.1 (independent of whether your cat actually left the house or not). What is the probability that your cat left the house given that your neighbor says it did so?",
      solution: 0.009,
      difficulty: 100
    },
    {
      question: "You are playing a 2D game where your character is trapped in a 6 × 6 grid. Your character starts at (1, 1), and can only move down and right. There are two power-ups located at (2, 3) and (4, 6). How many possible paths can your character take to get to (6 ,6), such that it collects at least one power-up?",
      solution: 131,
      difficulty: 100
    },
    {
      question: "What is the expected number of cards you need to draw from a 52-card deck before you see the first ace?",
      solution: 10.6,
      difficulty: 100
    },
    {
      question: "You roll a fair six-sided and sum the outcomes until you reach a multiple of 6. What is the expected number of times you expect to roll the die.",
      solution: 6,
      difficulty: 100
    },
    {
      question: "Paul flips a fair coin until he obtains two consecutive heads or tails for the first time. Find the probability Paul flips the coin an even number of times.",
      solution: 0.667,
      difficulty: 100
    } 
    
  ];

  for (const q of sampleQuestions) {
    try {
      await client.query(
        "INSERT INTO Questions (questions, solutions, difficulty) VALUES ($1, $2, $3)",
        [q.question, q.solution, q.difficulty]
      );
    } catch (error) {
      console.error(`Error inserting question: ${q.question}`, error);
    }
  }

  console.log(`Inserted ${sampleQuestions.length} sample questions`);
}