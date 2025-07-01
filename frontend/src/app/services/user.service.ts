// API calls for users

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api/users'; // Adjust the URL as needed

  constructor(private http: HttpClient) {}

  // Get user profile by username
  getUserProfile(username: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${username}`);
  }

  // Create a new user
  createUser(userData: any): Observable<any> {
    return this.http.post(this.apiUrl, userData);
  }

  // Update user profile
  updateUserProfile(username: string, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${username}`, userData);
  }

  // Delete user profile
    deleteUserProfile(username: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${username}`);
    }

// Sign in 
    signIn(credentials: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/signin`, credentials);
    }
    
    // // Sign out
    // signOut(): Observable<any> {
    //     return this.http.post(`${this.apiUrl}/signout`, {});
    // }
}
