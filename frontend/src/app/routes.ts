import { Routes } from '@angular/router';
import { WhiteboardComponent } from './whiteboard/whiteboard';
import { RoomSelectComponent } from './room-select/room.select.component';

export const routes: Routes = [
  { path: '', component: RoomSelectComponent },
  { path: 'whiteboard/:room', component: WhiteboardComponent }
];