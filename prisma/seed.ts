import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Users
  const verifierPassword = await bcrypt.hash("ashish123", 10);
  const darpanPassword = await bcrypt.hash("darpan123", 10);
  const staffPassword = await bcrypt.hash("staff123", 10);

  await prisma.user.upsert({
    where: { name: "Ashish" },
    update: {},
    create: { name: "Ashish", password: verifierPassword, role: "verifier" },
  });
  await prisma.user.upsert({
    where: { name: "Darpan" },
    update: {},
    create: { name: "Darpan", password: darpanPassword, role: "verifier" },
  });
  await prisma.user.upsert({
    where: { name: "Staff1" },
    update: {},
    create: { name: "Staff1", password: staffPassword, role: "staff" },
  });

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
