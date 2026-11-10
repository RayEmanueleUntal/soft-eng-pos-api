import { ExpenseCategory, PaymentMethod } from 'src/generated/prisma/client'; // Adjust import path if needed
import { prisma } from '../../client';

export async function seedExpenses() {
  // 1. Fetch reference staff members to associate with logged expenses
  const manager = await prisma.staffUser.findUnique({
    where: { username: 'manager_john' },
  });
  const cashier = await prisma.staffUser.findUnique({
    where: { username: 'cashier_mary' },
  });
  const stockClerk = await prisma.staffUser.findUnique({
    where: { username: 'stock_alex' },
  });

  const fallbackStaff = await prisma.staffUser.findFirst();
  const defaultStaffId = manager?.id || fallbackStaff?.id;

  if (!defaultStaffId) {
    throw new Error('Please run staff seeding before running expense seeding.');
  }

  // 2. Define realistic sample expenses covering all categories and payment methods
  const expensesData = [
    {
      category: ExpenseCategory.RENT,
      amount: 45000.0,
      payment_method: PaymentMethod.BANK_TRANSFER,
      notes: 'Store commercial space monthly rental fee for March 2026',
      date: new Date('2026-03-01T08:00:00Z'),
      staffId: manager?.id || defaultStaffId,
    },
    {
      category: ExpenseCategory.UTILITIES,
      amount: 18450.75,
      payment_method: PaymentMethod.BANK_TRANSFER,
      notes: 'Meralco electricity bill payment for Feb-March billing cycle',
      date: new Date('2026-03-05T10:30:00Z'),
      staffId: manager?.id || defaultStaffId,
    },
    {
      category: ExpenseCategory.UTILITIES,
      amount: 2850.0,
      payment_method: PaymentMethod.GCASH,
      notes: 'Maynilad water supply monthly bill',
      date: new Date('2026-03-06T14:15:00Z'),
      staffId: cashier?.id || defaultStaffId,
    },
    {
      category: ExpenseCategory.UTILITIES,
      amount: 3500.0,
      payment_method: PaymentMethod.BANK_TRANSFER,
      notes: 'PLDT Enterprise Fiber Internet Subscription',
      date: new Date('2026-03-07T09:00:00Z'),
      staffId: manager?.id || defaultStaffId,
    },
    {
      category: ExpenseCategory.SALARIES_WAGES,
      amount: 22000.0,
      payment_method: PaymentMethod.CASH,
      notes: 'Weekly overtime payouts and contractual helper allowances',
      date: new Date('2026-03-08T17:00:00Z'),
      staffId: manager?.id || defaultStaffId,
    },
    {
      category: ExpenseCategory.TAXES_LICENCES,
      amount: 8500.0,
      payment_method: PaymentMethod.CHECK,
      notes: 'Annual LGU Business Permit Renewal & Clearance Fee',
      date: new Date('2026-03-10T11:20:00Z'),
      staffId: manager?.id || defaultStaffId,
    },
    {
      category: ExpenseCategory.MAINTENANCE,
      amount: 4200.0,
      payment_method: PaymentMethod.CASH,
      notes:
        'Air conditioning unit cleaning and coolant refill in retail store',
      date: new Date('2026-03-12T13:45:00Z'),
      staffId: stockClerk?.id || defaultStaffId,
    },
    {
      category: ExpenseCategory.LOGISTICS,
      amount: 1500.0,
      payment_method: PaymentMethod.GCASH,
      notes: 'Fuel reimbursement for store pickup truck delivery run',
      date: new Date('2026-03-14T16:10:00Z'),
      staffId: stockClerk?.id || defaultStaffId,
    },
    {
      category: ExpenseCategory.LOGISTICS,
      amount: 650.0,
      payment_method: PaymentMethod.CASH,
      notes: 'Express courier delivery fee for urgent sample bolts to client',
      date: new Date('2026-03-15T09:30:00Z'),
      staffId: cashier?.id || defaultStaffId,
    },
    {
      category: ExpenseCategory.SUPPLIES,
      amount: 3450.25,
      payment_method: PaymentMethod.CREDIT,
      notes: 'Thermal receipt paper rolls, POS ink cartridges, and staplers',
      date: new Date('2026-03-16T15:00:00Z'),
      staffId: cashier?.id || defaultStaffId,
    },
    {
      category: ExpenseCategory.SUPPLIES,
      amount: 1200.0,
      payment_method: PaymentMethod.CASH,
      notes: 'Store cleaning supplies: mops, disinfectant, trash bags',
      date: new Date('2026-03-18T10:00:00Z'),
      staffId: stockClerk?.id || defaultStaffId,
    },
    {
      category: ExpenseCategory.MISCELLANEOUS,
      amount: 800.0,
      payment_method: PaymentMethod.CASH,
      notes: 'Staff emergency drinking water container refills',
      date: new Date('2026-03-20T14:00:00Z'),
      staffId: cashier?.id || defaultStaffId,
    },
  ];

  // 3. Insert expenses idempotently (matching date, notes, and amount)
  for (const item of expensesData) {
    const existing = await prisma.expense.findFirst({
      where: {
        notes: item.notes,
        amount: item.amount,
      },
    });

    if (!existing) {
      await prisma.expense.create({
        data: item,
      });
    }
  }

  console.log('Seed: Expenses seeded successfully.');
}
