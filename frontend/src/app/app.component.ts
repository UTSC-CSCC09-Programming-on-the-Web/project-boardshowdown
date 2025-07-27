// src/app/app.component.ts
import { Component, OnInit }             from '@angular/core';
import { CommonModule }          from '@angular/common';
import { WhiteboardComponent } from "./whiteboard/whiteboard";
import { Login } from "./login/login";
import { Router, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  loggedIn = false;

  yjsRooms = [
    'whiteboardd-room',
    'room-2',
    'room-3'
  ];
  currentYjsRoomIndex = 0;

  get currentYjsRoom() {
    return this.yjsRooms[this.currentYjsRoomIndex];
  }

  handleLoginSuccess() {
    this.loggedIn = true;
  }

  toggleYjsRoom() {
    this.currentYjsRoomIndex = (this.currentYjsRoomIndex + 1) % this.yjsRooms.length;
  }
}
