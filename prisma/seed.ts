import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Users
  const users: { name: string; password: string; role: string }[] = [
    { name: "Ashish",  password: await bcrypt.hash("ashish123",  10), role: "verifier" },
    { name: "Darpan",  password: await bcrypt.hash("darpan456",  10), role: "verifier" },
    { name: "Archana", password: await bcrypt.hash("archana789", 10), role: "staff" },
    { name: "Supriya", password: await bcrypt.hash("supriya147", 10), role: "staff" },
    { name: "Pradnya", password: await bcrypt.hash("pradnya258", 10), role: "staff" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { name: u.name },
      update: { password: u.password, role: u.role },
      create: { name: u.name, password: u.password, role: u.role },
    });
  }
  // Remove old Staff1 account if it exists
  await prisma.user.deleteMany({ where: { name: "Staff1" } });

  // Grade options
  const grades = [
    "EN-1A","EN-1A(L)","EN-8D","EN-8M","16MNCR5","20MNCR5","EN-19",
    "SAE-4140","EN-31","SAE-52100","SUP-9","EN-24","SAE-8620","EN-353",
    "SAE-1018","MS","SCR-420","SCM-420","SCM-415","52CRMOV4",
  ];
  for (const value of grades) {
    await prisma.dropdownOption.upsert({
      where: { field_value: { field: "grade", value } },
      update: {},
      create: { field: "grade", value, isSystem: true },
    });
  }

  // Size
  await prisma.dropdownOption.upsert({
    where: { field_value: { field: "size", value: "12.00mm" } },
    update: {},
    create: { field: "size", value: "12.00mm", isSystem: true },
  });

  // Make
  const makes = ["Tata","JSW-Salem","JSW-JFE","MSSSL-Hospet","MSSSL-Kalwe","Others"];
  for (const value of makes) {
    await prisma.dropdownOption.upsert({
      where: { field_value: { field: "make", value } },
      update: {},
      create: { field: "make", value, isSystem: true },
    });
  }

  // Location
  const locations = ["150","1407","1325","742","Savita","Sairam","Aishwarya","Golden","Sound","Others"];
  for (const value of locations) {
    await prisma.dropdownOption.upsert({
      where: { field_value: { field: "location", value } },
      update: {},
      create: { field: "location", value, isSystem: true },
    });
  }

  // Supply Condition — empty to start, user adds
  // Description
  const descriptions = ["Prime","Non-Prime"];
  for (const value of descriptions) {
    await prisma.dropdownOption.upsert({
      where: { field_value: { field: "description", value } },
      update: {},
      create: { field: "description", value, isSystem: true },
    });
  }

  // Machine options
  const machines = ["M1","M2","M3","Grinding","Belt Polishing","Others"];
  for (const value of machines) {
    await prisma.dropdownOption.upsert({
      where: { field_value: { field: "machine", value } },
      update: {},
      create: { field: "machine", value, isSystem: true },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
