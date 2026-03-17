import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '@ababu/data';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Get the required roles from the route metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, let them pass
    if (!requiredRoles) {
      return true;
    }

    // 2. Get the user from the request (attached by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
        throw new ForbiddenException('No user found in request');
    }

    // 3. Check if user has one of the required roles
    // OWNER can do anything (Optional power rule)
    if (user.role === UserRole.OWNER) return true;

    // Standard check
    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
        throw new ForbiddenException(`You need to be a ${requiredRoles.join(' or ')} to access this resource`);
    }

    return true;
  }
}