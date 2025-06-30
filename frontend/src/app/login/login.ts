import { Component, signal, computed, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { GoogleAuth } from '../google-auth'; // Ensure this path matches your project structure
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, HttpClientModule],
  templateUrl: `./login.html`,
})
export class Login implements OnInit {
  loginForm!: FormGroup<{
    username: FormControl<string | null>;
    password: FormControl<string | null>;
  }>;
  loggedIn = false;
  userProfile: any = null;

  @Output() loginSuccess = new EventEmitter<void>();


  constructor(private fb: FormBuilder, public auth: GoogleAuth) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });

    this.auth.getUserInfo().subscribe({
      next: () => this.loginSuccess.emit(),
      error: () => {}
    });
  }


  error = signal('');
  success = signal(false);

  isFormValid = computed(() => this.loginForm.valid);

  login() {
    const { username, password } = this.loginForm.value;

    if (username === 'admin' && password === 'password') {
      this.success.set(true);
      this.error.set('');
    } else {
      this.success.set(false);
      this.error.set('Invalid username or password.');
    }
  }

  loginWithGoogle() {
    this.auth.login();
  }

  logoutGoogle() {
    this.auth.logout();
  }
}
