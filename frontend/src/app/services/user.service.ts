// API calls for users

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  email: string;
  username?: string;
  name?: string;
  profile_picture?: string;
  stripe_customer_id?: string;
  subscription_status?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiEndpoint}/api/users`;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public token$ = this.tokenSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check if user is already logged in from localStorage
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('authToken');

    if (savedUser && savedToken) {
      try {
        const user = JSON.parse(savedUser);
        this.currentUserSubject.next(user);
        this.tokenSubject.next(savedToken);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        this.clearStorage();
      }
    }
  }

  private saveToStorage(user: User, token: string): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('authToken', token);
    this.currentUserSubject.next(user);
    this.tokenSubject.next(token);
  }

  private clearStorage(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    this.currentUserSubject.next(null);
    this.tokenSubject.next(null);
  }

  // Get user profile by username
  getUserProfile(username: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${username}`, { withCredentials: true });
  }

  // Get user profile by username
  getUserByUsername(username: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/username/${username}`, { withCredentials: true });
  }

  // Get user profile by email
  getUserByEmail(email: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/email/${email}`, { withCredentials: true });
  }

  // Update user profile
  updateUserProfile(username: string, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${username}`, userData, { withCredentials: true });
  }

  // Delete user profile
  deleteUserProfile(username: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${username}`, { withCredentials: true });
  }

  // Sign out
  signOut(): void {
    this.clearStorage();
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null && this.tokenSubject.value !== null;
  }

  // Get current user value
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Get current token
  getCurrentToken(): string | null {
    return this.tokenSubject.value;
  }
}
