import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';           // for ngIf/ngFor, etc.
import { ExcalidrawComponent } from './features/excalidraw/excalidraw.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,      // gives you *ngIf, *ngFor, etc.
    ExcalidrawComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})

export class AppComponent {
  title = 'BoardShowdown';
}
