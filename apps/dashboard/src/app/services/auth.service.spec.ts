import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: Router;

  // Mock Router to prevent actual navigation during tests
  const mockRouter = {
    navigate: jest.fn()
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: mockRouter }
      ]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    
    // Clear storage before each test
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no open requests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- TEST 1: STATE MANAGEMENT (Login) ---
  it('login() should update currentUser signal and navigate', () => {
    const mockResponse = { access_token: 'fake-jwt-token', user: { id: '1', username: 'test', role: 'ADMIN' } };
    
    // 1. Call login
    service.login({ username: 'test', password: '123' }).subscribe();

    // 2. Expect HTTP Request
    const req = httpMock.expectOne('http://localhost:3000/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse); // Return fake data

    // 3. VERIFY STATE UPDATE (Signal)
    expect(service.currentUser().token).toBe('fake-jwt-token');
    expect(localStorage.getItem('access_token')).toBe('fake-jwt-token');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  // --- TEST 2: STATE MANAGEMENT (Logout) ---
  it('logout() should clear state and navigate to login', () => {
    // Setup initial state
    localStorage.setItem('access_token', 'old-token');
    service.currentUser.set({ token: 'old-token' });

    // Call logout
    service.logout();

    // Verify State Cleared
    expect(service.currentUser().token).toBeNull();
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  });
});