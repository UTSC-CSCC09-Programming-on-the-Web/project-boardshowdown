import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { GoogleAuth } from '../google-auth';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: GoogleAuth, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.auth.getUserInfo().pipe(
      map(() => true),
      catchError(() => {
        this.router.navigate(['/']);
        return of(false);
      })
    );
  }
}