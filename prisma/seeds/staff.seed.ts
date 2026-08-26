import { AssignedRole } from '../../src/generated/prisma/client';
import * as argon from 'argon2';
import { prisma } from '../client';

export async function seedStaffUsers() {
  const defaultPassword = await argon.hash('staff123456');

  const staffList = [
    {
      username: 'manager_john',
      password_hash: defaultPassword,
      first_name: 'John',
      last_name: 'Doe',
      assigned_role: AssignedRole.MANAGER,
    },
    {
      username: 'cashier_mary',
      password_hash: defaultPassword,
      first_name: 'Mary',
      last_name: 'Smith',
      assigned_role: AssignedRole.CASHIER,
    },
    {
      username: 'stock_alex',
      password_hash: defaultPassword,
      first_name: 'Alex',
      last_name: 'Rivera',
      assigned_role: AssignedRole.STOCK_MANAGEMENT,
    },
  ];

  for (const staff of staffList) {
    await prisma.staffUser.upsert({
      where: { username: staff.username },
      update: {},
      create: staff,
    });
  }

  console.log('Seed: Staff users seeded.');
}
