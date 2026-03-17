import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { Observable } from 'rxjs'; 
import { tap } from 'rxjs/operators';


import { IAuthResponse, ILoginPayload, IRegisterPayload } from '@ababu/data';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  
  private apiUrl = 'http://localhost:3000/api'; 

  // Signal to track user state
  currentUser = signal<{ token: string | null }>({ token: localStorage.getItem('access_token') });

  // --- LOGIN ---
  login(payload: ILoginPayload): Observable<IAuthResponse> {
    return this.http.post<IAuthResponse>(`${this.apiUrl}/auth/login`, payload).pipe(
      tap(response => {
        
        localStorage.setItem('access_token', response.access_token); 
        
        this.currentUser.set({ token: response.access_token });
        this.router.navigate(['/']);
      })
    );
  }

  // --- REGISTER ---
  register(payload: IRegisterPayload): Observable<IAuthResponse> {
    return this.http.post<IAuthResponse>(`${this.apiUrl}/auth/register`, payload).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
        this.currentUser.set({ token: response.access_token });
        this.router.navigate(['/']);
      })
    );
  }

  // --- LOGOUT ---
  logout() {
    localStorage.removeItem('access_token');
    this.currentUser.set({ token: null });
    this.router.navigate(['/login']);
  }

  // Helper to get token
  getToken() {
    return this.currentUser().token;
  }

  // Helper to get username from token 
  getUsername(): string {
    const token = this.getToken();
    if (!token) return 'Guest';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.username;
    } catch (e) {
      return 'Guest';
    }
  }

  // Helper to get Role
  getUserRole(): string {
    const token = this.getToken();
    if (!token) return 'VIEWER';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || 'VIEWER';
    } catch (e) {
      return 'VIEWER';
    }
  }
}