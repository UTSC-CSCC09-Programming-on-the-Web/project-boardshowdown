import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RoomLeaderboardComponent } from '../leaderboard/leaderboard.component';
import { ScoreService } from '../services/leaderboard.service';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-room-select',
  standalone: true,
  imports: [FormsModule, CommonModule, RoomLeaderboardComponent, HeaderComponent],
  templateUrl: './room.select.component.html',
})
export class RoomSelectComponent {
  rooms: string[] = ['whiteboardd-room', 'room-2', 'room-3'];
  newRoom = '';
  searchTerm = '';
  mode: 'search' | 'create' = 'search';
  showLeaderboard = false;

  constructor(private router: Router, public scoreService: ScoreService) {}

  toggleMode() {
    this.mode = this.mode === 'create' ? 'search' : 'create';
    this.newRoom = '';
    this.searchTerm = '';
  }

  createRoom() {
    const room = this.newRoom.trim();
    if (!room) return;
    if (!this.rooms.includes(room)) {
      this.rooms.push(room);
    }
    this.goToRoom(room);
    this.newRoom = '';
  }

  goToRoom(room: string) {
    this.router.navigate(['/whiteboard', room]);
  }

  deleteRoom(room: string) {
    this.rooms = this.rooms.filter(r => r !== room);
  }

  filteredRooms() {
    const term = this.searchTerm.trim().toLowerCase();
    return term
      ? this.rooms.filter(room => room.toLowerCase().includes(term))
      : this.rooms;
  }

  openLeaderboard() {
    this.showLeaderboard = true;
  }
  closeLeaderboard = () => {
    this.showLeaderboard = false;
  };
}