// Model for rooms table
export const createRoomsTable = `
    CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INTEGER REFERENCES Users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        max_participants INTEGER DEFAULT NULL,
        is_private BOOLEAN DEFAULT false
    );
`;

// Index for faster queries
export const createRoomsIndexes = `
    CREATE INDEX IF NOT EXISTS idx_rooms_room_id ON rooms(room_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms(created_by);
    CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);
    CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at);
`;
