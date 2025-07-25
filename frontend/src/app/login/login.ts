import { Component, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { GoogleAuth } from '../google-auth';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
// Stripe imports
import { loadStripe } from '@stripe/stripe-js';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: `./login.html`,
})
export class Login implements OnInit {
  loggedIn = false;
  userProfile: any = null;

  @Output() loginSuccess = new EventEmitter<void>();

  loading = signal(false);

  constructor(
    public auth: GoogleAuth,
    private http: HttpClient
  ) {}
  stripePromise = loadStripe('pk_test_51RmTseRfn0SZAA4wfzjIHyEbLtHc0tx0cFhWaJZQHnHqEj9Ff4M4Z1IfTRPgqN90r9rv5kHRTo06B6SrRAhj5wqk00MSaJARsc');

  // Stripe subscription handler
  async subscribeWithStripe() {
    try {
      // Call backend to create a Stripe Checkout session
      const resp: any = await this.http.post('/api/create-subscription-checkout', {}, { withCredentials: true }).toPromise();
      const stripe = await this.stripePromise;
      if (stripe && resp.sessionId) {
        await stripe.redirectToCheckout({ sessionId: resp.sessionId });
      } else {
        this.error.set('Stripe session could not be created.');
      }
    } catch (err) {
      this.error.set('Stripe checkout failed.');
      console.error('Stripe checkout error:', err);
    }
  }

  ngOnInit(): void {
    this.auth.getUserInfo().subscribe({
      next: () => this.loginSuccess.emit(),
      error: () => {}
    });
  }
  error = signal('');
  success = signal(false);

  loginWithGoogle() {
    this.auth.login();
  }

  logoutGoogle() {
    this.auth.logout();
  }

  logout() {
    this.loggedIn = false;
    this.userProfile = null;
    this.success.set(false);
    this.error.set('');
  }
}
