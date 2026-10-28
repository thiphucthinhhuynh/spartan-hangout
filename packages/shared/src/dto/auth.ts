import type { Role } from '../enums.js';

/** The logged-in student, from POST /auth/login and GET /auth/me. */
export interface MeDto {
  id: string;
  displayName: string;
  role: Role;
}
