import express from 'express';
import { client } from '../datasource.js';


const router = express.Router();

// Create attempt record
router.post('/create-attempt', async (req, res) => {
  const { userId, questionId, isCorrect } = req.body;

  if (!userId || !questionId || typeof isCorrect !== 'boolean') {
    return res.status(400).json({ error: 'Missing required fields: userId, questionId, isCorrect' });
  }

  try {
    // Check if user has already attempted this question
    const previousAttempts = await client.query(
      'SELECT COUNT(*) FROM Attempts WHERE user_id = $1 AND question_id = $2',
      [userId, questionId]
    );

    const attemptCount = parseInt(previousAttempts.rows[0].count);
    const isFirstAttempt = attemptCount === 0;

    // Get question difficulty and all attempts for this question
    const questionResult = await client.query(
      'SELECT difficulty FROM Questions WHERE id = $1',
      [questionId]
    );

    if (questionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const difficulty = questionResult.rows[0].difficulty;

    // Get statistics for all attempts on this question
    const attemptsStats = await client.query(
      'SELECT COUNT(*) as total_attempts, COUNT(CASE WHEN is_correct = true THEN 1 END) as successful_attempts FROM Attempts WHERE question_id = $1',
      [questionId]
    );

    const totalAttempts = parseInt(attemptsStats.rows[0].total_attempts) || 0;
    const successfulAttempts = parseInt(attemptsStats.rows[0].successful_attempts) || 0;
    const unsuccessfulAttempts = totalAttempts - successfulAttempts;

    // Dynamic scoring formula
    // Base score = difficulty
    // Each successful attempt reduces score by 10% of difficulty (makes question easier)
    // Each unsuccessful attempt increases score by 5% of difficulty (makes question harder)
    // Minimum score is 1, maximum is difficulty * 2
    let calculatedScore = 0;
    if (isCorrect && isFirstAttempt) {
      const baseScore = difficulty;
      const successPenalty = successfulAttempts * (difficulty * 0.1);
      const failureBonus = unsuccessfulAttempts * (difficulty * 0.05);

      calculatedScore = baseScore - successPenalty + failureBonus;

      // Apply bounds: minimum 1, maximum 2x difficulty
      calculatedScore = Math.max(1, Math.min(calculatedScore, difficulty * 2));
      calculatedScore = Math.round(calculatedScore);
    }

    const result = await client.query(
      'INSERT INTO Attempts (user_id, question_id, is_correct, score) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, questionId, isCorrect, calculatedScore]
    );

    return res.json({
      success: true,
      attempt: result.rows[0],
      isFirstAttempt: isFirstAttempt,
      scoreAwarded: calculatedScore,
      questionDifficulty: difficulty,
      questionStats: {
        totalAttempts: totalAttempts,
        successfulAttempts: successfulAttempts,
        unsuccessfulAttempts: unsuccessfulAttempts,
        successRate: totalAttempts > 0 ? Math.round((successfulAttempts / totalAttempts) * 100) : 0
      }
    });
  } catch (err) {
    console.error('create-attempt error:', err);
    return res.status(500).json({ error: 'Failed to create attempt record' });
  }
});

// Get leaderboard based on attempt scores
router.get('/', async (req, res) => {
  try {
    // Get user scores by summing all their attempt scores
    const leaderboardResult = await client.query(`
      SELECT
        u.id,
        u.name,
        u.username,
        u.profile_picture,
        COALESCE(SUM(a.score), 0) as total_score,
        COUNT(CASE WHEN a.is_correct = true AND a.score > 0 THEN 1 END) as correct_attempts,
        COUNT(a.id) as total_attempts
      FROM users u
      LEFT JOIN attempts a ON u.id = a.user_id
      GROUP BY u.id, u.name, u.username, u.profile_picture
      ORDER BY total_score DESC, correct_attempts DESC
      LIMIT 50
    `);

    const leaderboard = leaderboardResult.rows.map(row => ({
      id: row.id,
      name: row.name || row.username,
      username: row.username,
      profilePicture: row.profile_picture,
      score: parseInt(row.total_score),
      correctAttempts: parseInt(row.correct_attempts),
      totalAttempts: parseInt(row.total_attempts)
    }));

    return res.json({ success: true, data: leaderboard });
  } catch (err) {
    console.error('leaderboard error:', err);
    return res.status(500).json({ error: 'Failed to fetch leaderboard data' });
  }
});

export default router;
