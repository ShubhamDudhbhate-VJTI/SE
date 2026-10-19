import { Role } from '@/contracts';

export function getDefaultRedirectPath(role: Role): string {
  const defaultRoute: Record<Role, string> = {
    [Role.ADMIN]: '/admin',
    [Role.KITCHEN]: '/kitchen',
    [Role.CASHIER]: '/cashier',
    [Role.WAITER]: '/waiter',
    [Role.CUSTOMER]: '/tables',
    [Role.RUNNER]: '/runner'
  };
  
  return defaultRoute[role] || '/';
}
