import { Routes } from '@angular/router';
import { LoginComponent } from './auth/login/login.component';
import { TaskListComponent } from './tasks/task-list/task-list.component';
import { authGuard } from './auth.guard'; 

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: '', 
    component: TaskListComponent,
    canActivate: [authGuard] // <--- THIS LOCKS THE DOOR
  }, 
  // Redirect unknown path to login
  { path: '**', redirectTo: 'login' } 
];