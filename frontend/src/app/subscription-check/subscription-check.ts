import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-subscription-check',
  imports:[CommonModule],
  template: `
    <div class="flex flex-col items-center justify-center min-h-screen">
      <div *ngIf="loading" class="text-lg">Checking subscription status...</div>
      <div *ngIf="!loading && !active">
        <p class="mb-4 text-red-600">You need an active subscription to continue.</p>
        <button class="bg-blue-600 text-white px-4 py-2 rounded" (click)="subscribeWithStripe()">Subscribe with Stripe</button>
      </div>
    </div>
  `
})
export class SubscriptionCheckComponent implements OnInit {
  loading = true;
  active = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.http.get('/api/users/me', { withCredentials: true }).subscribe({
      next: (user: any) => {
        if (user.subscription_status === 'active') {
          this.router.navigate(['/dashboard']); // or your main app route
        } else {
          this.active = false;
          this.loading = false;
        }
      },
      error: () => {
        this.loading = false;
        this.active = false;
      }
    });
  }

  async subscribeWithStripe() {
    const resp: any = await this.http.post('/api/auth/create-subscription-checkout', {}, { withCredentials: true }).toPromise();
    const { loadStripe } = await import('@stripe/stripe-js');
    const stripe = await loadStripe('pk_test_51RmTseRfn0SZAA4wfzjIHyEbLtHc0tx0cFhWaJZQHnHqEj9Ff4M4Z1IfTRPgqN90r9rv5kHRTo06B6SrRAhj5wqk00MSaJARsc');
    if (stripe && resp.sessionId) {
      await stripe.redirectToCheckout({ sessionId: resp.sessionId });
    }
  }
}
