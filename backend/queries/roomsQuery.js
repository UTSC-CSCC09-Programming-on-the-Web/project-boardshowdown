// Queries for room management
export const roomsQuery = {
  // Create a new room
  createRoom: `
    INSERT INTO rooms (room_id, name, created_by, description, is_private)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (room_id) DO NOTHING
    RETURNING *;
  `,

  // Get room details by room_id
  getRoomById: `
    SELECT * FROM rooms WHERE room_id = $1;
  `,

  // Get all rooms with participant counts
  getAllRoomsWithStats: `
    SELECT 
      r.room_id,
      r.name,
      r.description,
      r.created_by,
      r.created_at,
      r.is_private,
      r.max_participants,
      COALESCE(COUNT(rp.user_id) FILTER (WHERE rp.is_active = true), 0) as participant_count,
      MAX(rp.last_heartbeat) as last_activity
    FROM rooms r
    LEFT JOIN room_participants rp ON r.room_id = rp.room_id
    WHERE r.is_active = true
    GROUP BY r.id, r.room_id, r.name, r.description, r.created_by, r.created_at, r.is_private, r.max_participants
    ORDER BY 
      CASE WHEN COUNT(rp.user_id) FILTER (WHERE rp.is_active = true) > 0 THEN 0 ELSE 1 END,
      MAX(rp.last_heartbeat) DESC NULLS LAST,
      r.created_at DESC;
  `,

  // Get rooms created by a specific user
  getRoomsByCreator: `
    SELECT 
      r.*,
      COALESCE(COUNT(rp.user_id) FILTER (WHERE rp.is_active = true), 0) as participant_count
    FROM rooms r
    LEFT JOIN room_participants rp ON r.room_id = rp.room_id
    WHERE r.created_by = $1 AND r.is_active = true
    GROUP BY r.id
    ORDER BY r.created_at DESC;
  `,

  // Update room details
  updateRoom: `
    UPDATE rooms 
    SET name = COALESCE($2, name),
        description = COALESCE($3, description),
        is_private = COALESCE($4, is_private),
        max_participants = COALESCE($5, max_participants)
    WHERE room_id = $1
    RETURNING *;
  `,

  // Deactivate a room (soft delete)
  deactivateRoom: `
    UPDATE rooms 
    SET is_active = false
    WHERE room_id = $1
    RETURNING *;
  `,

  // Check if room exists
  roomExists: `
    SELECT EXISTS(SELECT 1 FROM rooms WHERE room_id = $1 AND is_active = true);
  `
};
