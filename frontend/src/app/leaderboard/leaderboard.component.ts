import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Leader } from '../services/leaderboard.service';

@Component({
  selector: 'app-room-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: `./leaderboard.component.html`
})
export class RoomLeaderboardComponent {
  @Input() leaders: Leader[] | null = null;
  @Input() close!: () => void;
}