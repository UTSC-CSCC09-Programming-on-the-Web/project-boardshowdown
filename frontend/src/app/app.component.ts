// src/app/app.component.ts
import { Component, OnInit }             from '@angular/core';
import { FormsModule }           from '@angular/forms';
import { CommonModule }          from '@angular/common';
import {
  NgWhiteboardComponent,
  NgWhiteboardService,
  WhiteboardElement,
  WhiteboardOptions,
  ToolType,
  FormatType,
  LineJoin,
  LineCap,
  ElementType
} from 'ng-whiteboard';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
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
