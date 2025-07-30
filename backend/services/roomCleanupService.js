import { client } from '../datasource.js';
import { roomParticipantsQuery } from '../queries/roomParticipantsQuery.js';

class RoomCleanupService {
  constructor(intervalMinutes = 2, timeoutMinutes = 5) {
    this.intervalMs = intervalMinutes * 60 * 1000; // Convert to milliseconds
    this.timeoutSeconds = timeoutMinutes * 60; // Convert to seconds
    this.cleanupInterval = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('Room cleanup service is already running');
      return;
    }

    console.log(`Starting room cleanup service - checking every ${this.intervalMs / 60000} minutes, timeout after ${this.timeoutSeconds / 60} minutes`);
    
    this.isRunning = true;
    
    // Run cleanup immediately
    this.cleanup();
    
    // Then run periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.intervalMs);
  }

  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    console.log('Room cleanup service stopped');
  }

  async cleanup() {
    try {
      console.log('Running room cleanup...');
      
      const result = await client.query(
        roomParticipantsQuery.cleanupInactiveParticipants, 
        [this.timeoutSeconds]
      );
      
      if (result.rows.length > 0) {
        console.log(`Cleaned up ${result.rows.length} inactive participants:`);
        result.rows.forEach(row => {
          console.log(`  - User ${row.user_id} removed from room ${row.room_id}`);
        });
      } else {
        console.log(' No inactive participants to clean up');
      }
      
      return result.rows.length;
    } catch (error) {
      console.error('Error during room cleanup:', error);
      return 0;
    }
  }

  // Get current service status
  getStatus() {
    return {
      running: this.isRunning,
      intervalMinutes: this.intervalMs / 60000,
      timeoutMinutes: this.timeoutSeconds / 60,
      nextCleanup: this.cleanupInterval ? 
        new Date(Date.now() + this.intervalMs).toISOString() : null
    };
  }
}

// Export singleton instance
export const roomCleanupService = new RoomCleanupService();

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('Shutting down room cleanup service...');
  roomCleanupService.stop();
  // Exit after cleanup
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down room cleanup service...');
  roomCleanupService.stop();
  // Exit after cleanup
  process.exit(0);
});
