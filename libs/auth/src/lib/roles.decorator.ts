import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@ababu/data';

// Key used to store metadata
export const ROLES_KEY = 'roles';

// The Decorator function
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);