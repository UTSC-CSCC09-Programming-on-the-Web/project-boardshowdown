import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, BehaviorSubject } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RoomParticipant {
  user_id: number;
  room_id: string;
  joined_at: string;
  last_heartbeat: string;
  username: string;
  name: string;
  profile_picture: string;
}

export interface RoomStats {
  room_id: string;
  total_participants: number;
  active_participants: number;
  last_activity: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private apiUrl = '/api/rooms';
  private currentRoom: string | null = null;
  private heartbeatInterval: any = null;
  private participantsInterval: any = null;
  private participantsSubject = new BehaviorSubject<RoomParticipant[]>([]);
  
  public participants$ = this.participantsSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Create a new room
  createRoom(roomId: string, name: string, description?: string, isPrivate: boolean = false): Observable<any> {
    return this.http.post(`${this.apiUrl}/create`, { 
      roomId, 
      name, 
      description, 
      isPrivate 
    }, { withCredentials: true });
  }

    // Join a room
  joinRoom(roomId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/join`, { roomId }, { withCredentials: true });
  }

  // Leave a room
  leaveRoom(roomId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/leave`, { roomId }, { withCredentials: true });
  }

  // Auto-join room (used when navigating to whiteboard)
  autoJoinRoom(roomId: string): Observable<any> {
    return this.joinRoom(roomId);
  }

  // Get participants in a room
  getParticipants(roomId: string): Observable<any> {
    const url = `${this.apiUrl}/${roomId}/participants`;
    console.log('Fetching participants from:', url);
    return this.http.get(url, { withCredentials: true });
  }

  // Get user's active rooms
  getUserRooms(): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/rooms`, { withCredentials: true });
  }

  // Get all active rooms
  getActiveRooms(): Observable<any> {
    console.log('Requesting active rooms from:', `${this.apiUrl}/active`);
    return this.http.get(`${this.apiUrl}/active`, { withCredentials: true }).pipe(
      catchError(error => {
        console.error('Detailed error in getActiveRooms:', error);
        console.error('Error status:', error.status);
        console.error('Error response:', error.error);
        console.error('Error headers:', error.headers);
        return of({ success: false, rooms: [], error: error.message });
      })
    );
  }

  // Get room statistics
  getRoomStats(roomId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${roomId}/stats`, { withCredentials: true });
  }

  // Start monitoring a room (heartbeat + participant updates)
  startRoomMonitoring(roomId: string) {
    console.log(`Starting room monitoring for: ${roomId}`);
    
    // Stop any existing monitoring first
    this.stopRoomMonitoring();
    
    this.currentRoom = roomId;
    
    // Auto-join the room first
    this.autoJoinRoom(roomId).subscribe({
      next: (response) => {
        if (response.success) {
          console.log(`Joined room ${roomId} with ${response.totalParticipants} participants`);
          // Immediately fetch participants to populate the subject
          this.getParticipants(roomId).subscribe({
            next: (participantsResponse) => {
              if (participantsResponse.success) {
                this.participantsSubject.next(participantsResponse.participants);
              }
            },
            error: (error) => console.error('Error fetching initial participants:', error)
          });
        }
      },
      error: (error) => console.error('Error auto-joining room:', error)
    });

    // Start heartbeat every 30 seconds
    this.heartbeatInterval = interval(30000).pipe(
      switchMap(() => this.sendHeartbeat(roomId)),
      catchError(error => {
        console.error('Heartbeat error:', error);
        return of(null);
      })
    ).subscribe();

    // Update participants every 10 seconds
    this.participantsInterval = interval(10000).pipe(
      switchMap(() => this.getParticipants(roomId)),
      catchError(error => {
        console.error('Error fetching participants:', error);
        return of({ success: false, participants: [] });
      })
    ).subscribe(response => {
      if (response.success) {
        this.participantsSubject.next(response.participants);
      }
    });
  }

  // Stop monitoring a room
  stopRoomMonitoring() {
    if (this.currentRoom) {
      console.log(`Stopping room monitoring for: ${this.currentRoom}`);
      
      // Leave the room
      this.leaveRoom(this.currentRoom).subscribe({
        next: () => console.log(`Left room ${this.currentRoom}`),
        error: (error) => console.error('Error leaving room:', error)
      });
      
      this.currentRoom = null;
    }

    // Clean up intervals
    if (this.heartbeatInterval) {
      this.heartbeatInterval.unsubscribe();
      this.heartbeatInterval = null;
    }

    if (this.participantsInterval) {
      this.participantsInterval.unsubscribe();
      this.participantsInterval = null;
    }

    // Clear participants
    this.participantsSubject.next([]);
  }

    // Send heartbeat to indicate user is still active
  private sendHeartbeat(roomId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/heartbeat`, { roomId }, { withCredentials: true });
  }

  // Get current room
  getCurrentRoom(): string | null {
    return this.currentRoom;
  }

  // Get participant count for current room
  getParticipantCount(): number {
    return this.participantsSubject.value.length;
  }
}
