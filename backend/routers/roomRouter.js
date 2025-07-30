import express from 'express';
import { client } from '../datasource.js';
import { roomParticipantsQuery } from '../queries/roomParticipantsQuery.js';
import { roomsQuery } from '../queries/roomsQuery.js';

const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Create a new room
router.post('/create', requireAuth, async (req, res) => {
  const { roomId, name, description, isPrivate = false } = req.body;
  const userId = req.session.user.id;

  if (!roomId || !name) {
    return res.status(400).json({ error: 'Room ID and name are required' });
  }

  try {
    // Check if room already exists
    const existsResult = await client.query(roomsQuery.roomExists, [roomId]);
    if (existsResult.rows[0].exists) {
      return res.status(409).json({ error: 'Room already exists' });
    }

    // Create the room
    const result = await client.query(roomsQuery.createRoom, [
      roomId,
      name,
      userId,
      description || '',
      isPrivate
    ]);

    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Room already exists' });
    }

    console.log(`Room ${roomId} created by user ${userId}`);

    res.json({
      success: true,
      room: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Join a room
router.post('/join', requireAuth, async (req, res) => {
  const { roomId } = req.body;
  const userId = req.session.user.id;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    // Check if room exists, if not create it automatically
    const existsResult = await client.query(roomsQuery.roomExists, [roomId]);
    if (!existsResult.rows[0].exists) {
      // Auto-create room when someone tries to join
      console.log(`Auto-creating room ${roomId}`);
      await client.query(roomsQuery.createRoom, [
        roomId,
        roomId, // Use roomId as name by default
        userId,
        `Auto-created room: ${roomId}`,
        false // not private
      ]);
    }

    // Join the room
    const result = await client.query(roomParticipantsQuery.joinRoom, [userId, roomId]);
    console.log(`User ${userId} joined room ${roomId}`);

    // Get updated participant list
    const participants = await client.query(roomParticipantsQuery.getActiveParticipants, [roomId]);

    res.json({
      success: true,
      participant: result.rows[0],
      totalParticipants: participants.rows.length
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

// Leave a room
router.post('/leave', requireAuth, async (req, res) => {
  const { roomId } = req.body;
  const userId = req.session.user.id;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    const result = await client.query(roomParticipantsQuery.leaveRoom, [userId, roomId]);
    console.log(`User ${userId} left room ${roomId}`);

    res.json({
      success: true,
      participant: result.rows[0]
    });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
});

// Send heartbeat to indicate user is still active
router.post('/heartbeat', requireAuth, async (req, res) => {
  const { roomId } = req.body;
  const userId = req.session.user.id;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    const result = await client.query(roomParticipantsQuery.updateHeartbeat, [userId, roomId]);

    if (result.rows.length === 0) {
      // User not in room, auto-join them
      await client.query(roomParticipantsQuery.joinRoom, [userId, roomId]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating heartbeat:', error);
    res.status(500).json({ error: 'Failed to update heartbeat' });
  }
});

// Get participants in a room
router.get('/:roomId/participants', async (req, res) => {
  const { roomId } = req.params;

  try {
    const participants = await client.query(roomParticipantsQuery.getActiveParticipants, [roomId]);

    res.json({
      success: true,
      participants: participants.rows,
      count: participants.rows.length
    });
  } catch (error) {
    console.error('Error getting participants:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

// Get user's active rooms
router.get('/user/rooms', requireAuth, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const rooms = await client.query(roomParticipantsQuery.getUserRooms, [userId]);

    res.json({
      success: true,
      rooms: rooms.rows
    });
  } catch (error) {
    console.error('Error getting user rooms:', error);
    res.status(500).json({ error: 'Failed to get user rooms' });
  }
});

// Get all active rooms with stats
router.get('/active', async (req, res) => {
  try {
    console.log('Getting all active rooms...');
    const rooms = await client.query(roomsQuery.getAllRoomsWithStats);
    console.log('Query result:', rooms.rows);

    // If no rooms exist, return some default rooms for testing
    if (rooms.rows.length === 0) {
      console.log('No rooms found, creating default rooms...');

      // Create default rooms
      const defaultRooms = [
        { id: 'math-study-room', name: 'Math Study Room', description: 'Collaborate on math problems' },
        { id: 'physics-homework', name: 'Physics Homework', description: 'Physics problem solving' },
        { id: 'general-discussion', name: 'General Discussion', description: 'Open discussion room' }
      ];

      for (const room of defaultRooms) {
        try {
          await client.query(roomsQuery.createRoom, [
            room.id,
            room.name,
            null, // no specific creator
            room.description,
            false
          ]);
        } catch (error) {
          // Room might already exist, continue
          console.log(`Room ${room.id} might already exist:`, error.message);
        }
      }

      // Fetch rooms again after creating defaults
      const newRooms = await client.query(roomsQuery.getAllRoomsWithStats);
      res.json({
        success: true,
        rooms: newRooms.rows
      });
    } else {
      res.json({
        success: true,
        rooms: rooms.rows
      });
    }
  } catch (error) {
    console.error('Error getting active rooms:', error);
    res.status(500).json({ error: 'Failed to get active rooms' });
  }
});

// Get room statistics
router.get('/:roomId/stats', async (req, res) => {
  const { roomId } = req.params;

  try {
    const stats = await client.query(roomParticipantsQuery.getRoomStats, [roomId]);

    res.json({
      success: true,
      stats: stats.rows[0] || {
        room_id: roomId,
        total_participants: 0,
        active_participants: 0,
        last_activity: null
      }
    });
  } catch (error) {
    console.error('Error getting room stats:', error);
    res.status(500).json({ error: 'Failed to get room stats' });
  }
});

// Admin endpoint to manually cleanup inactive users
router.post('/cleanup', async (req, res) => {
  const { timeoutSeconds = 300 } = req.body; // Default 5 minutes

  try {
    const result = await client.query(roomParticipantsQuery.cleanupInactiveParticipants, [timeoutSeconds]);

    console.log(`Cleaned up ${result.rows.length} inactive participants`);

    res.json({
      success: true,
      cleanedUp: result.rows.length,
      participants: result.rows
    });
  } catch (error) {
    console.error('Error cleaning up participants:', error);
    res.status(500).json({ error: 'Failed to cleanup participants' });
  }
});

router.post('/auto-join-room', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { roomId } = req.body;
  const userId = req.session.user.id;

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    const { roomParticipantsQuery } = await import('../queries/roomParticipantsQuery.js');

    // Join the room
    await client.query(roomParticipantsQuery.joinRoom, [userId, roomId]);

    // Get updated participant list
    const participants = await client.query(roomParticipantsQuery.getActiveParticipants, [roomId]);

    console.log(`User ${userId} (${req.session.user.username}) auto-joined room ${roomId}`);

    res.json({
      success: true,
      participants: participants.rows,
      count: participants.rows.length
    });
  } catch (error) {
    console.error('Error auto-joining room:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
});

export { router as roomRouter };
