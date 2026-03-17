import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      
      <div class="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 class="text-2xl font-bold mb-6 text-center text-gray-800"> Task Management System</h2>
        <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">Login</h2>
        
        <form (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label class="block text-gray-700 text-sm font-bold mb-2">Username</label>
            <input 
              type="text" 
              [(ngModel)]="username" 
              name="username"
              class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="username"
            >
          </div>
          
          <div class="mb-6">
            <label class="block text-gray-700 text-sm font-bold mb-2">Password</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password"
              class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="password"
            >
          </div>
          
          <button 
            type="submit" 
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-150"
          >
            Sign In
          </button>
          
          <p *ngIf="error" class="text-red-500 text-xs italic mt-4 text-center">{{ error }}</p>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';
  
  private authService = inject(AuthService);
  private router = inject(Router);
  constructor() {
  // If I already have a token, get me out of here!
  if (this.authService.currentUser() || localStorage.getItem('access_token')) {
    this.router.navigate(['/']);
  }
}

  onSubmit() {
    this.authService.login({ username: this.username, password: this.password }).subscribe({
      next: () => {
        console.log('Login successful');
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error(err);
        this.error = 'Invalid credentials';
      }
    });
  }
}