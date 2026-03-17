import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor'; // <--- 1. IMPORT THIS

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    // 2. ADD IT HERE:
    provideHttpClient(withInterceptors([authInterceptor])), 
  ],
};