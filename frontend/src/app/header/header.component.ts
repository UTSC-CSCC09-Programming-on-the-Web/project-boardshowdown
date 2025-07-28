import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RoomLeaderboardComponent } from '../leaderboard/leaderboard.component';
import { ScoreService } from '../services/leaderboard.service';
import { GoogleAuth } from '../google-auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RoomLeaderboardComponent],
  templateUrl: `header.component.html`,
})
export class HeaderComponent {
  showLeaderboard = false;

  constructor(
    private router: Router,
    public scoreService: ScoreService,
    private auth: GoogleAuth
  ) {}

  logout() {
    this.auth.logout().subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Redirect even if logout fails
        this.router.navigate(['/']);
      }
    });
  }

  openLeaderboard() {
    this.showLeaderboard = true;
  }

  closeLeaderboard = () => {
    this.showLeaderboard = false;
  };
}