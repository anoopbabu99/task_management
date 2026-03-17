import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ITask, TaskStatus } from '@ababu/data';
export type Task = ITask;



@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/tasks';

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.apiUrl);
  }
  askClaude(prompt: string): Observable<string> {
    // 1. Point directly to the AI controller, not the tasks controller
    // 2. Removed getHeaders() because your Interceptor handles the JWT automatically!
    return this.http.post<string>('http://localhost:3000/api/ai/ask', { prompt });
  }

  reorderTasks(ids: string[]): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/reorder`, { ids });
  }
  // inside TaskService class
  createTask(task: { title: string; description: string }): Observable<Task> {
    return this.http.post<Task>(this.apiUrl, task);
  }
  updateTask(id: string, task: { title?: string; description?: string; status?: string }): Observable<Task> {
  
  return this.http.patch<Task>(`${this.apiUrl}/${id}`, task);
}
deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
  getAuditLogs(): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/audit-log`);
}

  
}