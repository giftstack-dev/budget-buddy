export type RoutePath =
  | '/'
  | '/register'
  | '/login'
  | '/onboarding'
  | '/dashboard'
  | '/expenses'
  | '/savings'
  | '/plan'
  | '/year'
  | '/reviews';

export type HouseholdType = 'alone' | 'partner' | 'family' | 'roommates';
export type HousingType = 'rent' | 'own' | 'family_house' | 'company_housing';
export type EmploymentType =
  | 'salary'
  | 'corps_member'
  | 'student_allowance'
  | 'wages'
  | 'business_irregular';

export type IncomeFrequency = 'monthly' | 'weekly' | 'biweekly';
export type CostFrequency = 'weekly' | 'monthly' | 'termly' | 'yearly';
export type PlanMode = 'planner' | 'log_only';

export type CostCategory =
  | 'rent'
  | 'utilities'
  | 'data_airtime'
  | 'transport'
  | 'food'
  | 'school_fees'
  | 'family_support'
  | 'debt_payments'
  | 'giving'
  | 'insurance_subscriptions';

export type ExpenseCategory =
  | 'food'
  | 'transport'
  | 'data_airtime'
  | 'household'
  | 'health'
  | 'eating_out'
  | 'entertainment'
  | 'personal_care'
  | 'clothing_shopping'
  | 'gifts'
  | 'other'
  | 'no_spend';

export interface ProfileData {
  city: string;
  householdType: HouseholdType;
  dependentsCount: number;
  housingType: HousingType;
  employmentType: EmploymentType;
  emergencyMonths: number;
  emergencySavingsKobo: number;
  festiveFundEnabled: boolean;
  mode: PlanMode;
  savingsRatePct: number;
}

export interface IncomeData {
  label: string;
  amountKobo: number;
  frequency: IncomeFrequency;
  nextPayDate: string; // YYYY-MM-DD
}

export interface FixedCostItem {
  id: string;
  category: CostCategory;
  label: string;
  amountKobo: number;
  frequency: CostFrequency;
  dueMonth: number | null;
}

export interface GoalItem {
  id: string;
  name: string;
  targetKobo: number;
  savedKobo: number;
  deadline: string; // YYYY-MM-DD
}

export interface ExpenseItem {
  id: string;
  spentOn: string; // YYYY-MM-DD
  amountKobo: number;
  category: ExpenseCategory;
  note: string;
}

export interface BudgetUser {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  password: string;
  isDemo: boolean;
  onboardingStep: number; // 1..5
  onboardingDone: boolean;
  profile: ProfileData;
  income: IncomeData;
  costs: FixedCostItem[];
  goals: GoalItem[];
  expenses: ExpenseItem[];
}
