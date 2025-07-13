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

  logout(): void {
    this.http.get(`${this.apiUrl}/logout`, { withCredentials: true }).subscribe(() => {
      console.log('Logged out from server');
    });
  }

  getUserInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me`, { withCredentials: true });
  }
}
