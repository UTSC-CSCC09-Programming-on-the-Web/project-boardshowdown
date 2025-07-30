// src/app/app.component.ts
import { Component, OnInit }             from '@angular/core';
import { CommonModule }          from '@angular/common';
import { WhiteboardComponent } from "./whiteboard/whiteboard";
import { Login } from "./login/login";
import { Router, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { GoogleAuth } from './google-auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {


}
