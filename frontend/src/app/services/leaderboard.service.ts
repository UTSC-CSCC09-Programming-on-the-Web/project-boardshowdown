import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Leader {
  id: number;
  name: string;
  username: string;
  profilePicture?: string;
  score: number;
  correctAttempts: number;
  totalAttempts: number;
}

export interface LeaderboardResponse {
  success: boolean;
  data: Leader[];
}

@Injectable({
  providedIn: 'root'
})
export class ScoreService {
  private apiUrl = `${environment.apiEndpoint}/api/leaderboard`;
  private leaders$ = new BehaviorSubject<Leader[]>([]);

  constructor(private http: HttpClient) {}

  getLeaders(): Observable<Leader[]> {
    return this.leaders$.asObservable();
  }

  fetchLeaderboard(): Observable<LeaderboardResponse> {
    return this.http.get<LeaderboardResponse>(this.apiUrl);
  }

  updateLeaderboard(): void {
    this.fetchLeaderboard().subscribe({
      next: (response) => {
        if (response.success) {
          this.leaders$.next(response.data);
        }
      },
      error: (error) => {
        console.error('Error fetching leaderboard:', error);
      }
    });
  }

  // Legacy methods for compatibility (can be removed if not used elsewhere)
  changeScore(id: number, delta: number): void {
    const leaders = this.leaders$.value;
    const leader = leaders.find(l => l.id === id);
    if (leader) {
      leader.score += delta;
      this.leaders$.next([...leaders].sort((a, b) => b.score - a.score));
    }
  }

  addLeader(name: string): Leader {
    const newLeader: Leader = {
      id: Math.floor(Math.random() * 100000),
      name,
      username: name.toLowerCase(),
      score: 0,
      correctAttempts: 0,
      totalAttempts: 0
    };
    const leaders = this.leaders$.value;
    leaders.push(newLeader);
    this.leaders$.next([...leaders].sort((a, b) => b.score - a.score));
    return newLeader;
  }
}