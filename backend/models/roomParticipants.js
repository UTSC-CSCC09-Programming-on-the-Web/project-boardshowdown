// Model for room_participants table
export const createRoomParticipantsTable = `
    CREATE TABLE IF NOT EXISTS room_participants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
        room_id VARCHAR(255) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        left_at TIMESTAMP NULL,
        UNIQUE(user_id, room_id)
    );
`;

// Index for faster queries
export const createRoomParticipantsIndexes = `
    CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);
    CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON room_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_room_participants_active ON room_participants(room_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_room_participants_heartbeat ON room_participants(last_heartbeat);
`;
