import type {BudgetUser} from './types';

const USERS_KEY = 'budget_buddy_users_v1';
const SESSION_KEY = 'budget_buddy_active_user_id_v1';

export function loadRegisteredUsers(): BudgetUser[] {
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as BudgetUser[]) : [];
  } catch {
    return [];
  }
}

export function saveRegisteredUsers(users: BudgetUser[]): void {
  try {
    window.localStorage.setItem(
      USERS_KEY,
      JSON.stringify(users.filter((u) => !u.isDemo)),
    );
  } catch {
    // Ignore storage quota issues in constrained browsers.
  }
}

export function loadActiveUserId(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function saveActiveUserId(userId: string | null): void {
  try {
    if (userId) {
      window.localStorage.setItem(SESSION_KEY, userId);
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // Ignore storage errors.
  }
}
