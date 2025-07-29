import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Leader, ScoreService } from '../services/leaderboard.service';

@Component({
  selector: 'app-room-leaderboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: `./leaderboard.component.html`
})
export class RoomLeaderboardComponent implements OnInit {
  @Input() leaders: Leader[] | null = null;
  @Input() close!: () => void;

  constructor(private scoreService: ScoreService) {}

  ngOnInit() {
    // Update leaderboard when component initializes
    this.scoreService.updateLeaderboard();
    
    // Subscribe to leaderboard changes
    this.scoreService.getLeaders().subscribe(leaders => {
      this.leaders = leaders;
    });
  }
}