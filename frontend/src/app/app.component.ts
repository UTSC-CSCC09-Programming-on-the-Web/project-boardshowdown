// src/app/app.component.ts
import { Component, OnInit }             from '@angular/core';
import { CommonModule }          from '@angular/common';
import { WhiteboardComponent } from "./whiteboard/whiteboard";
import { Login } from "./login/login";
import { HttpClientModule } from '@angular/common/http';
import { GoogleAuth } from './google-auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WhiteboardComponent, Login, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {

  loggedIn = false;

  constructor(private auth: GoogleAuth) {}

  handleLoginSuccess() {
    this.loggedIn = true;
  }

  handleLogout() {
    this.auth.logout().subscribe({
      next: (response) => {
        console.log('Logout successful:', response);
        this.loggedIn = false;
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even if server logout fails, clear local state
        this.loggedIn = false;
      }
    });
  }

}
