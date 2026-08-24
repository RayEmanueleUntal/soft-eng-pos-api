import { AssignedRole } from '../../src/generated/prisma/client';
import * as argon from 'argon2';
import { prisma } from './client';

export async function seedAdmin() {
  const adminPass = 'adminpassword123';
  const adminObj = {
    username: 'admin123',
    password_hash: await argon.hash(adminPass),
    first_name: 'Admin',
    last_name: 'Istrator',
    assigned_role: AssignedRole.ADMIN,
  };

  const existingAdmin = await prisma.staffUser.findUnique({
    where: { username: adminObj.username },
  });

  if (existingAdmin) {
    console.log('Seed: Initial admin user already exists. Skipping.');
    return;
  }

  const admin = await prisma.staffUser.create({
    data: adminObj,
  });

  console.log(`Seed: Super Admin created successfully with ID: ${admin.id}`);
}
