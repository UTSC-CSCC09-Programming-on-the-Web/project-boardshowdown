import { Router } from "express";
import { client } from "../datasource.js";
import { questionBankQuery } from "../queries/questionBankQuery.js";

export const questionBankRouter = Router();
// Get all questions from the question bank
questionBankRouter.get("/", async (req, res) => {
  try {
    const result = await client.query(questionBankQuery.getQuestionBankQuery);
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error("Error fetching question bank:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch question bank"
    });
  }
});

// Get a random question from the question bank (MUST be before /:id route)
questionBankRouter.get("/random", async (req, res) => {
  try {
    const result = await client.query(questionBankQuery.getRandomQuestionQuery);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No questions available"
      });
    }
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error fetching random question:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch random question"
    });
  }
});

// Get a specific question by ID
questionBankRouter.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query(questionBankQuery.getQuestionByIdQuery, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Question not found"
      });
    }
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch question"
    });
  }
});

