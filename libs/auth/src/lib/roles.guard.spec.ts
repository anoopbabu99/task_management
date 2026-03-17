import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@ababu/data';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  // Helper to mock the ExecutionContext (The Request)
  const createMockContext = (userRole?: UserRole, handlerRoles?: UserRole[]) => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: userRole ? { role: userRole } : undefined, // Mock User attached to request
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if no roles are required (Public Route)', () => {
    const context = createMockContext(UserRole.VIEWER);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null); 

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has the REQUIRED role', () => {
    const context = createMockContext(UserRole.ADMIN);
    // Route requires ADMIN
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should BLOCK access if user has the WRONG role', () => {
    const context = createMockContext(UserRole.VIEWER); // User is Viewer
    // Route requires ADMIN
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    // Should throw ForbiddenException (403)
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow OWNER to bypass checks (God Mode)', () => {
    const context = createMockContext(UserRole.OWNER); // User is OWNER
    // Route requires ADMIN (Owner should still pass)
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(context)).toBe(true);
  });
  
  it('should THROW ForbiddenException if NO user is attached', () => {
    const context = createMockContext(undefined); // No user
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);

  
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});