import { Routes } from '@angular/router';
import { WhiteboardComponent } from './whiteboard/whiteboard';
import { RoomSelectComponent } from './room-select/room.select.component';
import { Login } from './login/login';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: Login },
  { path: 'dashboard', component: RoomSelectComponent, canActivate: [AuthGuard] },
  { path: 'whiteboard/:room', component: WhiteboardComponent, canActivate: [AuthGuard] }
];