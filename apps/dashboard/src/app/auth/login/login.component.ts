import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        
        <div class="text-center mb-8">
          <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
            <span class="text-2xl">🔐</span>
          </div>
          <h2 class="text-2xl font-extrabold text-gray-900">Task Management System</h2>
          <p class="text-sm text-gray-500 mt-2">
            {{ isLoginMode ? 'Sign in to your account' : 'Create a new account' }}
          </p>
        </div>
        
        <form (ngSubmit)="onSubmit()" class="space-y-5">
          
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-1">Username</label>
            <input type="text" [(ngModel)]="username" name="username"
              class="appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter username">
          </div>
          
          <div>
            <label class="block text-gray-700 text-sm font-bold mb-1">Password</label>
            <input type="password" [(ngModel)]="password" name="password"
              class="appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••">
          </div>

          <ng-container *ngIf="!isLoginMode">
            
            <div>
              <label class="block text-gray-700 text-sm font-bold mb-1">Account Role</label>
              <select [(ngModel)]="role" name="role" (change)="onRoleChange()"
                      class="appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="OWNER">Owner (Create New Company)</option>
                <option value="ADMIN">Admin (Create New Department)</option>
                <option value="VIEWER">Viewer (Join Department)</option>
              </select>
            </div>

            <div *ngIf="role === 'OWNER'">
              <label class="block text-gray-700 text-sm font-bold mb-1">Company Name</label>
              <input type="text" [(ngModel)]="organizationName" name="organizationName"
                class="appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Wayne Enterprises">
            </div>

            <div *ngIf="role === 'ADMIN' || role === 'VIEWER'">
              <label class="block text-gray-700 text-sm font-bold mb-1">Select Company</label>
              <select [(ngModel)]="selectedRootOrgId" name="selectedRootOrgId" (change)="onRootOrgChange()"
                      class="appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="" disabled selected>-- Choose Company --</option>
                <option *ngFor="let org of rootOrgs" [value]="org.id">{{ org.name }}</option>
              </select>
            </div>

            <div *ngIf="role === 'ADMIN'">
              <label class="block text-gray-700 text-sm font-bold mb-1">New Department Name</label>
              <input type="text" [(ngModel)]="organizationName" name="organizationName"
                class="appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Engineering">
            </div>

            <div *ngIf="role === 'VIEWER'">
              <label class="block text-gray-700 text-sm font-bold mb-1">Select Department</label>
              <select [(ngModel)]="selectedSubOrgId" name="selectedSubOrgId"
                      class="appearance-none border border-gray-300 rounded-md w-full py-2 px-3 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="" disabled selected>-- Choose Department --</option>
                <option *ngFor="let sub of filteredSubOrgs" [value]="sub.id">{{ sub.name }}</option>
              </select>
              <p *ngIf="filteredSubOrgs.length === 0 && selectedRootOrgId" class="text-xs text-amber-600 mt-1">
                No departments exist in this company yet.
              </p>
            </div>

          </ng-container>
          
          <button type="submit" [disabled]="isLoading"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 disabled:bg-blue-400 mt-4">
            {{ isLoading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Create Account') }}
          </button>
          
          <div *ngIf="error" class="mt-4 bg-red-50 border-l-4 border-red-500 p-4">
            <p class="text-red-700 text-sm">{{ error }}</p>
          </div>

          <div class="mt-6 text-center border-t border-gray-200 pt-5">
            <button type="button" (click)="toggleMode()" class="text-sm text-blue-600 hover:text-blue-800 font-semibold transition">
              {{ isLoginMode ? "Don't have an account? Sign up" : 'Already have an account? Sign in' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  isLoginMode = true; 
  
  // Form fields
  username = '';
  password = '';
  role = 'OWNER';
  
  // Org logic fields
  organizationName = ''; 
  selectedRootOrgId = ''; 
  selectedSubOrgId = ''; 

  // Data arrays
  allOrgs: any[] = [];
  rootOrgs: any[] = [];
  filteredSubOrgs: any[] = [];

  error = '';
  isLoading = false;
  
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor() {
    if (this.authService.currentUser() || localStorage.getItem('access_token')) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit() {
    // Fetch orgs so they are ready if the user toggles to Signup
    this.authService.getOrganizations().subscribe({
      next: (orgs) => {
        this.allOrgs = orgs;
        this.rootOrgs = orgs.filter(o => !o.parent);
      }
    });
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.error = '';
  }

  onRoleChange() {
    // Reset selections when role changes
    this.organizationName = '';
    this.selectedRootOrgId = '';
    this.selectedSubOrgId = '';
    this.error = '';
  }

  onRootOrgChange() {
    // Filter Sub-Orgs to only show ones belonging to the chosen Parent
    this.filteredSubOrgs = this.allOrgs.filter(o => o.parent && o.parent.id === this.selectedRootOrgId);
    this.selectedSubOrgId = ''; 
  }

  onSubmit() {
    if (!this.username || !this.password) {
      this.error = 'Username and password are required.';
      return;
    }

    this.isLoading = true;
    this.error = '';

    if (this.isLoginMode) {
      // --- LOGIN FLOW ---
      this.authService.login({ username: this.username, password: this.password }).subscribe({
        next: () => this.router.navigate(['/']),
        error: () => {
          this.error = 'Invalid credentials';
          this.isLoading = false;
        }
      });
    } else {
      // --- SIGNUP FLOW ---
      const payload: any = {
        username: this.username,
        password: this.password,
        role: this.role
      };

      // Construct payload based on specific role rules
      if (this.role === 'OWNER') {
        if (!this.organizationName) { this.error = 'Company Name is required.'; this.isLoading = false; return; }
        payload.organizationName = this.organizationName;
      } 
      else if (this.role === 'ADMIN') {
        if (!this.selectedRootOrgId || !this.organizationName) { this.error = 'Company and Department Name are required.'; this.isLoading = false; return; }
        payload.parentId = this.selectedRootOrgId;
        payload.organizationName = this.organizationName;
      } 
      else if (this.role === 'VIEWER') {
        if (!this.selectedSubOrgId) { this.error = 'Department selection is required.'; this.isLoading = false; return; }
        payload.organizationId = this.selectedSubOrgId;
      }

      this.authService.signup(payload).subscribe({
        next: () => {
          // Auto-login after successful signup
          this.authService.login({ username: this.username, password: this.password }).subscribe({
            next: () => this.router.navigate(['/'])
          });
        },
        error: (err) => {
          this.error = err.error?.message || 'Signup failed. Username might be taken.';
          this.isLoading = false;
        }
      });
    }
  }
}