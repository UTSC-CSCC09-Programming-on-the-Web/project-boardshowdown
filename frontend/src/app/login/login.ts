import { Component, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { GoogleAuth } from '../google-auth';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { HttpClientModule } from '@angular/common/http';
// Stripe imports
import { loadStripe } from '@stripe/stripe-js';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HttpClientModule],
  templateUrl: `./login.html`,
})
export class Login implements OnInit {
  loggedIn = false;
  userProfile: any = null;
  @Output() loginSuccess = new EventEmitter<void>();


  loading = signal(false);
  error = signal('');
  success = signal(false);

  constructor(
    public auth: GoogleAuth,
    private userService: UserService,
    private router: Router,
    private http: HttpClient
  ) {}
  stripePromise = loadStripe('pk_test_51RmTseRfn0SZAA4wfzjIHyEbLtHc0tx0cFhWaJZQHnHqEj9Ff4M4Z1IfTRPgqN90r9rv5kHRTo06B6SrRAhj5wqk00MSaJARsc');

  // Stripe subscription handler
  async subscribeWithStripe() {
    try {
      // Call backend to create a Stripe Checkout session
      const resp: any = await this.http.post(`${environment.apiEndpoint}/api/create-subscription-checkout`, {}, { withCredentials: true }).toPromise();
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
    // Check if user is returning from successful payment
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      // User is returning from successful Stripe checkout
      console.log('Returning from Stripe checkout with session:', sessionId);
      this.error.set('Payment successful! Verifying subscription...');
      // Wait a bit for webhook to process, then check authentication
      setTimeout(() => {
        this.checkUserAuthentication(true); // Pass flag indicating this is after payment
      }, 3000); // Wait 3 seconds for webhook processing
    } else {
      // Normal authentication check
      this.checkUserAuthentication(false);
    }
  }

  private checkUserAuthentication(afterPayment: boolean = false, retryCount: number = 0): void {
    this.loading.set(true);
    this.auth.getUserInfo().subscribe({
      next: (userInfo) => {
        console.log('User info received:', userInfo);
        this.userProfile = userInfo;
        this.loading.set(false);

        // Check subscription status
        if (userInfo.subscription_status !== 'active') {
          console.log('User subscription not active');

          // If this is after payment and subscription is still not active, retry a few times
          if (afterPayment && retryCount < 3) {
            console.log(`Retrying subscription check (${retryCount + 1}/3)...`);
            this.error.set(`Verifying subscription... (${retryCount + 1}/3)`);
            setTimeout(() => {
              this.checkUserAuthentication(true, retryCount + 1);
            }, 2000); // Wait 2 seconds between retries
            return;
          }

          // If not after payment, or if retries exhausted, redirect to checkout
          console.log('Redirecting to checkout');
          this.error.set('Subscription required. Redirecting to checkout...');
          setTimeout(() => {
            this.subscribeWithStripe();
          }, 1500);
        } else {
          // User has active subscription, proceed with login
          console.log('User has active subscription');
          this.success.set(true);
          this.error.set('');


          // Clean up URL if coming from payment success
          if (afterPayment) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        console.error('Error getting user info:', error);
        this.loading.set(false);

        // If this is after payment and we get an auth error, might need to re-authenticate
        if (afterPayment) {
          this.error.set('Please log in again to complete your subscription activation.');
        } else {
          // User is not authenticated, show login form
          this.error.set('');
        }
      }
    });
  }


  loginWithGoogle() {
    this.loading.set(true);
    this.error.set('');
    this.success.set(false);
    this.auth.login();

  }

  logoutGoogle() {
    this.loading.set(true);
    this.auth.logout().subscribe({
      next: (response) => {
        console.log('Logout successful:', response);
        this.logout();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Logout error:', error);
        // Even if server logout fails, clear local state
        this.logout();
        this.loading.set(false);
      }
    });
  }

  logout() {
    this.loggedIn = false;
    this.userProfile = null;
    this.success.set(false);
    this.error.set('');
    this.loading.set(false);
  }
}
