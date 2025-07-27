import { Component, signal, computed, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { GoogleAuth } from '../google-auth';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: `./login.html`,
})
export class Login implements OnInit {
  loginForm!: FormGroup<{
    email: FormControl<string | null>;
    password: FormControl<string | null>;
  }>;
  loggedIn = false;
  userProfile: any = null;


  isSignUpMode = signal(false);
  loading = signal(false);

  constructor(
    private fb: FormBuilder,
    public auth: GoogleAuth,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });

    // If already authenticated, redirect to RoomSelect
    this.auth.getUserInfo().subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {}
    });
  }
  error = signal('');
  success = signal(false);

  isFormValid = computed(() => {
    if (!this.loginForm) return false;
    return this.loginForm.valid;
  });

  toggleMode() {
    this.isSignUpMode.update(v => !v);
    this.success.set(false);
    this.error.set('');
    this.loading.set(false);
    this.loginForm.reset();
  }

  // login using userService api
  login() {
    const { email, password } = this.loginForm.value;

    // Clear previous messages
    this.error.set('');
    this.success.set(false);

    // Validate inputs
    if (!email || !email.trim()) {
      this.error.set('Email is required');
      return;
    }

    if (!password || !password.trim()) {
      this.error.set('Password is required');
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      this.error.set('Please enter a valid email address');
      return;
    }

    this.loading.set(true);

    if (this.isSignUpMode()) {
      // Sign up mode - create new user
      this.userService.createUser({ email: email.trim(), password }).subscribe({
        next: (response) => {
          this.loading.set(false);
          if (response.success) {
            this.success.set(true);
            this.error.set('');
            // Automatically sign in after successful signup
            setTimeout(() => {
              this.performSignIn(email.trim(), password);
            }, 1000);
          } else {
            this.success.set(false);
            this.error.set(response.error || 'Failed to create account');
          }
        },
        error: (error) => {
          this.loading.set(false);
          this.success.set(false);
          console.error('Signup error:', error);
          if (error.error?.error) {
            this.error.set(error.error.error);
          } else {
            this.error.set('Failed to create account. Please try again.');
          }
        }
      });
    } else {
      // Login mode
      this.performSignIn(email.trim(), password);
    }
  }

  private performSignIn(email: string, password: string) {
    this.userService.signIn({ email, password }).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (response.success && response.data) {
          this.success.set(true);
          this.error.set('');
          this.userProfile = response.data;
          this.loggedIn = true;
          this.router.navigate(['/dashboard']);
        } else {
          this.success.set(false);
          this.error.set('Invalid email or password');
        }
      },
      error: (error) => {
        this.loading.set(false);
        this.success.set(false);
        if (error.status === 401) {
          this.error.set('Invalid email or password');
        } else {
          this.error.set('Login failed. Please try again.');
        }
      }
    });
  }

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
    this.loginForm.reset();
  }
}
