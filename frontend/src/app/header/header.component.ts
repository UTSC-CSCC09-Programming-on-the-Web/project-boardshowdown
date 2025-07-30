import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { RoomLeaderboardComponent } from '../leaderboard/leaderboard.component';
import { ScoreService } from '../services/leaderboard.service';
import { GoogleAuth } from '../google-auth';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RoomLeaderboardComponent],
  templateUrl: `header.component.html`,
})
export class HeaderComponent {
  showLeaderboard = false;
  currentUrl = '';

  constructor(
    private router: Router,
    public scoreService: ScoreService,
    private auth: GoogleAuth
  ) {
    // Subscribe to router events to track current URL
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentUrl = event.urlAfterRedirects;
      });
  }

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

  isOnWhiteboardPage(): boolean {
    return this.currentUrl.includes('/whiteboard/');
  }

  getCurrentRoomName(): string {
    if (this.isOnWhiteboardPage()) {
      const urlParts = this.currentUrl.split('/');
      const roomIndex = urlParts.indexOf('whiteboard') + 1;
      if (roomIndex < urlParts.length) {
        return decodeURIComponent(urlParts[roomIndex]);
      }
    }
    return '';
  }

  goBackToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}