import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskListComponent } from './task-list.component';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { of, throwError } from 'rxjs';
import { TaskStatus, UserRole } from '@ababu/data';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('TaskListComponent', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let taskService: any;
  let authService: any;

  // Mock Data
  const mockTasks = [
    { id: '1', title: 'Task 1', status: TaskStatus.OPEN, category: 'Work' }
  ];

  beforeEach(async () => {
    // Create Spies (Mocks) for Services
    taskService = {
      getTasks: jest.fn().mockReturnValue(of(mockTasks)),
      deleteTask: jest.fn().mockReturnValue(of(true))
    };

    authService = {
      getUserRole: jest.fn().mockReturnValue('ADMIN'), // Default to Admin
      currentUser: jest.fn().mockReturnValue({ token: 'valid-token' }),
      getUsername: jest.fn().mockReturnValue('TestUser')
    };

    await TestBed.configureTestingModule({
      imports: [TaskListComponent, DragDropModule], // Standalone Component import
      providers: [
        { provide: TaskService, useValue: taskService },
        { provide: AuthService, useValue: authService }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA] // Ignore unknown elements (like icons)
    }).compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // Trigger ngOnInit
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --- TEST 1: LOAD TASKS ---
  it('should load tasks on init', () => {
    expect(taskService.getTasks).toHaveBeenCalled();
    expect(component.allTasks.length).toBe(1);
    expect(component.todoTasks.length).toBe(1); // Task 1 is OPEN
  });

  // --- TEST 2: RBAC DELETE (Admin) ---
  it('Admin should open DELETE confirmation modal', () => {
    // 1. Setup as Admin
    authService.getUserRole.mockReturnValue('ADMIN');
    component.userRole = 'ADMIN';

    // 2. Click Delete
    component.initiateDelete(mockTasks[0] as any);

    // 3. Verify Delete Modal Open / Access Denied Closed
    expect(component.isDeleteModalOpen).toBe(true);
    expect(component.isAccessDeniedModalOpen).toBe(false);
  });

  // --- TEST 3: RBAC DELETE (Viewer) ---
  it('Viewer should open ACCESS DENIED modal', () => {
    // 1. Setup as Viewer
    authService.getUserRole.mockReturnValue('VIEWER');
    component.userRole = 'VIEWER';

    // 2. Click Delete
    component.initiateDelete(mockTasks[0] as any);

    // 3. Verify Access Denied Open / Delete Modal Closed
    expect(component.isAccessDeniedModalOpen).toBe(true);
    expect(component.isDeleteModalOpen).toBe(false);
  });
});