import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GoogleAuth {

  constructor(private http: HttpClient) {}

  login(): void {
    window.location.href = 'http://localhost:3000/auth/google';
  }

  logout(): void {
    this.http.get('http://localhost:3000/logout', { withCredentials: true }).subscribe(() => {
      console.log('Logged out from server');
    });
  }

  getUserInfo(): Observable<any> {
    return this.http.get('http://localhost:3000/me', { withCredentials: true });
  }
}
