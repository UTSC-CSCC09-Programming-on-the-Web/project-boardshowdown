export const roomParticipantsQuery = (function () {
  "use strict";

  let module = {};

  // Join a room
  module.joinRoom = `
    INSERT INTO room_participants (user_id, room_id, joined_at, last_heartbeat, is_active)
    VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true)
    ON CONFLICT (user_id, room_id) 
    DO UPDATE SET 
      is_active = true,
      joined_at = CURRENT_TIMESTAMP,
      last_heartbeat = CURRENT_TIMESTAMP,
      left_at = NULL
    RETURNING *;
  `;

  // Leave a room
  module.leaveRoom = `
    UPDATE room_participants 
    SET is_active = false, left_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND room_id = $2 AND is_active = true
    RETURNING *;
  `;

  // Update heartbeat
  module.updateHeartbeat = `
    UPDATE room_participants 
    SET last_heartbeat = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND room_id = $2 AND is_active = true
    RETURNING *;
  `;

  // Get active participants in a room
  module.getActiveParticipants = `
    SELECT 
      rp.user_id,
      rp.room_id,
      rp.joined_at,
      rp.last_heartbeat,
      u.username,
      u.name,
      u.profile_picture
    FROM room_participants rp
    JOIN Users u ON rp.user_id = u.id
    WHERE rp.room_id = $1 AND rp.is_active = true
    ORDER BY rp.joined_at ASC;
  `;

  // Get all rooms a user is in
  module.getUserRooms = `
    SELECT DISTINCT room_id, joined_at, last_heartbeat
    FROM room_participants 
    WHERE user_id = $1 AND is_active = true
    ORDER BY joined_at DESC;
  `;

  // Get room statistics
  module.getRoomStats = `
    SELECT 
      room_id,
      COUNT(*) as total_participants,
      COUNT(CASE WHEN is_active = true THEN 1 END) as active_participants,
      MAX(last_heartbeat) as last_activity
    FROM room_participants 
    WHERE room_id = $1
    GROUP BY room_id;
  `;

  // Cleanup inactive participants (heartbeat older than threshold)
  module.cleanupInactiveParticipants = `
    UPDATE room_participants 
    SET is_active = false, left_at = CURRENT_TIMESTAMP
    WHERE is_active = true 
    AND last_heartbeat < NOW() - INTERVAL '1 second' * $1
    RETURNING user_id, room_id;
  `;

  // Get all active rooms with participant counts
  module.getAllActiveRooms = `
    SELECT 
      room_id,
      COUNT(*) as participant_count,
      MAX(last_heartbeat) as last_activity,
      MIN(joined_at) as created_at
    FROM room_participants 
    WHERE is_active = true
    GROUP BY room_id
    ORDER BY last_activity DESC;
  `;

  return module;
})();
