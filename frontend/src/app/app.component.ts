// src/app/app.component.ts
import { Component, OnInit }             from '@angular/core';
import { CommonModule }          from '@angular/common';
import { WhiteboardComponent } from "./whiteboard/whiteboard";
import { Login } from "./login/login";
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [WhiteboardComponent, Login, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {

  loggedIn = false;

  handleLoginSuccess() {
    this.loggedIn = true;
  }

}
