import {addDaysISO, addMonthsISO, todayLagosISO} from './engine';
import type {BudgetUser, ExpenseCategory} from './types';

export function createDemoVisitorUser(): BudgetUser {
  const today = todayLagosISO();
  const currentMonth = Number(today.slice(5, 7));
  const dueMonth = ((currentMonth + 3 - 1) % 12) + 1;

  // Next payday on the 28th
  let next28 = `${today.slice(0, 7)}-28`;
  if (next28 <= today) {
    next28 = addMonthsISO(next28, 1, 28);
  }

  const seededEntries: Array<[number, number, ExpenseCategory, string]> = [
    [42, 3_500_00, 'food', 'Rice, tomatoes and pepper'],
    [41, 1_200_00, 'transport', 'Keke and bus to work'],
    [40, 2_500_00, 'data_airtime', 'Monthly data bundle'],
    [39, 0, 'no_spend', 'No spending today'],
    [38, 4_200_00, 'eating_out', 'Lunch with colleagues'],
    [37, 2_000_00, 'food', 'Bread, eggs and plantain'],
    [36, 1_500_00, 'transport', 'Shuttle fare'],
    [35, 14_000_00, 'food', 'Weekly market stock-up'],
    [34, 8_500_00, 'clothing_shopping', 'Work shirt'],
    [33, 6_500_00, 'eating_out', 'Weekend suya and drinks'],
    [32, 3_200_00, 'transport', 'Ride in rain'],
    [31, 4_500_00, 'entertainment', 'Cinema outing'],
    [30, 2_800_00, 'personal_care', 'Haircut and toiletries'],
    [29, 0, 'no_spend', 'No spending today'],
    [28, 12_000_00, 'food', 'Garri, beans and palm oil'],
    [27, 2_200_00, 'transport', 'Daily commute'],
    [26, 1_800_00, 'health', 'Pharmacy pain relief'],
    [25, 3_000_00, 'data_airtime', 'Airtime and data top-up'],
    [24, 2_500_00, 'eating_out', 'Boli and fish'],
    [23, 0, 'no_spend', 'No spending today'],
    [22, 1_600_00, 'household', 'Detergent and soap'],
    [21, 9_500_00, 'food', 'Fresh fish and vegetables'],
    [20, 2_400_00, 'transport', 'Work bus fares'],
    [19, 3_800_00, 'gifts', 'Birthday contribution'],
    [18, 1_500_00, 'food', 'Fruits and water'],
    [17, 2_200_00, 'eating_out', 'Meat pie and drink'],
    [16, 1_400_00, 'transport', 'Keke errands'],
    [15, 0, 'no_spend', 'No spending today'],
    [14, 15_500_00, 'food', 'Two-week food restock'],
    [13, 3_500_00, 'data_airtime', 'Data renewal'],
    [12, 9_000_00, 'entertainment', 'Sunday hangout'],
    [11, 4_800_00, 'transport', 'Intercity bus'],
    [10, 5_500_00, 'eating_out', 'Dinner out'],
    [9, 2_000_00, 'personal_care', 'Body cream'],
    [8, 3_200_00, 'food', 'Yam and eggs'],
    [7, 4_000_00, 'food', 'Vegetables and chicken'],
    [6, 1_600_00, 'transport', 'Morning commute'],
    [5, 0, 'no_spend', 'No spending today'],
    [4, 2_800_00, 'eating_out', 'Jollof rice lunch'],
    [3, 1_900_00, 'household', 'Cooking spices'],
    [2, 1_500_00, 'transport', 'Keke back home'],
    [1, 3_000_00, 'food', 'Groceries top-up'],
  ];

  return {
    id: `demo-${Date.now()}`,
    displayName: 'Demo Visitor',
    email: 'demo@budgetbuddy.example',
    phone: '',
    password: '',
    isDemo: true,
    onboardingStep: 5,
    onboardingDone: true,
    profile: {
      city: 'Lagos',
      householdType: 'alone',
      dependentsCount: 0,
      housingType: 'rent',
      employmentType: 'salary',
      emergencyMonths: 3,
      emergencySavingsKobo: 120_000_00,
      festiveFundEnabled: true,
      mode: 'planner',
      savingsRatePct: 10,
    },
    income: {
      label: 'Monthly salary',
      amountKobo: 240_000_00,
      frequency: 'monthly',
      nextPayDate: next28,
    },
    costs: [
      {
        id: 'demo-rent',
        category: 'rent',
        label: 'Yearly rent',
        amountKobo: 480_000_00,
        frequency: 'yearly',
        dueMonth,
      },
      {
        id: 'demo-food',
        category: 'food',
        label: 'Food & groceries',
        amountKobo: 60_000_00,
        frequency: 'monthly',
        dueMonth: null,
      },
      {
        id: 'demo-transport',
        category: 'transport',
        label: 'Transport',
        amountKobo: 25_000_00,
        frequency: 'monthly',
        dueMonth: null,
      },
      {
        id: 'demo-data',
        category: 'data_airtime',
        label: 'Data & airtime',
        amountKobo: 10_000_00,
        frequency: 'monthly',
        dueMonth: null,
      },
      {
        id: 'demo-utilities',
        category: 'utilities',
        label: 'Power, water & gas',
        amountKobo: 12_000_00,
        frequency: 'monthly',
        dueMonth: null,
      },
      {
        id: 'demo-family',
        category: 'family_support',
        label: 'Family support',
        amountKobo: 15_000_00,
        frequency: 'monthly',
        dueMonth: null,
      },
    ],
    goals: [
      {
        id: 'demo-goal-1',
        name: 'Emergency appliance upgrade',
        targetKobo: 300_000_00,
        savedKobo: 95_000_00,
        deadline: addMonthsISO(today, 9),
      },
    ],
    expenses: seededEntries.map(([daysAgo, amountKobo, category, note], idx) => ({
      id: `demo-exp-${idx}`,
      spentOn: addDaysISO(today, -daysAgo),
      amountKobo,
      category,
      note,
    })),
  };
}
