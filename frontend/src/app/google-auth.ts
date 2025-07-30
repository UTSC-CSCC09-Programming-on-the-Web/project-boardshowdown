import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GoogleAuth {

  private apiUrl = environment.apiEndpoint;

  constructor(private http: HttpClient) {}

  login(): void {
    window.location.href = `${this.apiUrl}/auth/google`;
  }

  logout(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/logout`, { withCredentials: true });
  }

  getUserInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/auth/me`, { withCredentials: true });
  }
}
