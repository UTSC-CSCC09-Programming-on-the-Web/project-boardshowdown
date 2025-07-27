import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Leader {
  id: number;
  name: string;
  score: number;
}

@Injectable({
  providedIn: 'root'
})
export class ScoreService {
  private leaders: Leader[] = [
    { id: 1, name: 'Alice', score: 120 },
    { id: 2, name: 'Bob', score: 95 },
    { id: 3, name: 'Charlie', score: 80 },
    { id: 4, name: 'Alice2', score: 1220 },
    { id: 5, name: 'Bob2', score: 915 },
    { id: 6, name: 'Charlie2', score: 890 },
    { id: 7, name: 'Alice3', score: 120 },
    { id: 8, name: 'Bob3', score: 915 },
    { id: 9, name: 'Charlie3', score: 180 },
    { id: 10, name: 'Alice4', score: 1203 },
    { id: 11, name: 'Bob4', score: 935 },
    { id: 12, name: 'Charlie4', score: 840 },
    { id: 1, name: 'Alice', score: 120 },
    { id: 2, name: 'Bob', score: 95 },
    { id: 3, name: 'Charlie', score: 80 },
    { id: 4, name: 'Alice2', score: 1220 },
    { id: 5, name: 'Bob2', score: 915 },
    { id: 6, name: 'Charlie2', score: 890 },
    { id: 7, name: 'Alice3', score: 120 },
    { id: 8, name: 'Bob3', score: 915 },
    { id: 9, name: 'Charlie3', score: 180 },
    { id: 10, name: 'Alice4', score: 1203 },
    { id: 11, name: 'Bob4', score: 935 },
    { id: 12, name: 'Charlie4', score: 840 }
  ];
  private leaders$ = new BehaviorSubject<Leader[]>(this.getSortedLeaders());

  getLeaders(): Observable<Leader[]> {
    return this.leaders$.asObservable();
  }

  changeScore(id: number, delta: number): void {
    const leader = this.leaders.find(l => l.id === id);
    if (leader) {
      leader.score += delta;
      this.leaders$.next(this.getSortedLeaders());
    }
  }

  addLeader(name: string): Leader {
    const newLeader: Leader = {
      id: Math.floor(Math.random() * 100000),
      name,
      score: 0
    };
    this.leaders.push(newLeader);
    this.leaders$.next(this.getSortedLeaders());
    return newLeader;
  }

  private getSortedLeaders(): Leader[] {
    return [...this.leaders].sort((a, b) => b.score - a.score);
  }
}