import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RoomLeaderboardComponent } from '../leaderboard/leaderboard.component';
import { ScoreService } from '../services/leaderboard.service';
import { HeaderComponent } from '../header/header.component';
import { RoomService } from '../services/room.service';

interface ActiveRoom {
  room_id: string;
  name: string;
  description?: string;
  participant_count: number;
  last_activity: string;
  created_at: string;
}

@Component({
  selector: 'app-room-select',
  standalone: true,
  imports: [FormsModule, CommonModule, RoomLeaderboardComponent, HeaderComponent],
  templateUrl: './room.select.component.html',
  styleUrls: ['./room.select.component.css']
})
export class RoomSelectComponent implements OnInit, OnDestroy {
  activeRooms: ActiveRoom[] = [];
  newRoom = '';
  searchTerm = '';
  mode: 'search' | 'create' = 'search';
  showLeaderboard = false;
  loading = false;
  refreshInterval: any = null;

  constructor(
    private router: Router, 
    public scoreService: ScoreService,
    private roomService: RoomService
  ) {}

  ngOnInit() {
    this.loadActiveRooms();
    // Refresh room list every 15 seconds
    this.refreshInterval = setInterval(() => {
      this.loadActiveRooms();
    }, 15000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadActiveRooms() {
    this.loading = true;
    console.log('Loading active rooms...');
    this.roomService.getActiveRooms().subscribe({
      next: (response) => {
        console.log('Received response:', response);
        if (response.success) {
          this.activeRooms = response.rooms;
          console.log('Active rooms loaded:', this.activeRooms);
        } else {
          console.log('Response was not successful:', response);
          this.activeRooms = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading active rooms:', error);
        this.activeRooms = [];
        this.loading = false;
      }
    });
  }

  setMode(mode: 'search' | 'create') {
    this.mode = mode;
    // Clear inputs when switching modes for better UX
    this.newRoom = '';
    this.searchTerm = '';
  }

  createRoom() {
    const roomId = this.newRoom.trim();
    if (!roomId) return;
    
    this.loading = true;
    console.log(`Creating room: ${roomId}`);
    
    // Create the room first
    this.roomService.createRoom(roomId, roomId, `Room: ${roomId}`).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Room created successfully:', response.room);
          // Refresh the room list to show the new room
          this.loadActiveRooms();
          // Navigate to the new room
          this.goToRoom(roomId);
        } else {
          console.error('Failed to create room:', response);
          // If room already exists, just navigate to it
          this.goToRoom(roomId);
        }
        this.newRoom = '';
        this.loading = false;
      },
      error: (error) => {
        console.error('Error creating room:', error);
        if (error.status === 409) {
          // Room already exists, just navigate to it
          console.log('Room already exists, navigating to it');
          this.goToRoom(roomId);
        } else {
          // Other error, still try to navigate (backend might auto-create)
          this.goToRoom(roomId);
        }
        this.newRoom = '';
        this.loading = false;
      }
    });
  }

  goToRoom(room: string) {
    this.router.navigate(['/whiteboard', room]);
  }

  deleteRoom(room: string) {
    // This will be handled by room cleanup service automatically
    // For now, just refresh the room list
    this.loadActiveRooms();
  }

  filteredRooms() {
    const term = this.searchTerm.trim().toLowerCase();
    return term
      ? this.activeRooms.filter((room: ActiveRoom) => 
          room.room_id.toLowerCase().includes(term) || 
          (room.name && room.name.toLowerCase().includes(term)) ||
          (room.description && room.description.toLowerCase().includes(term))
        )
      : this.activeRooms;
  }

  openLeaderboard() {
    this.showLeaderboard = true;
  }
  
  closeLeaderboard = () => {
    this.showLeaderboard = false;
  };

  // Helper method to format last activity time
  formatLastActivity(lastActivity: string): string {
    if (!lastActivity) return 'No activity';
    
    const now = new Date();
    const activity = new Date(lastActivity);
    const diffMs = now.getTime() - activity.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return activity.toLocaleDateString();
  }
}