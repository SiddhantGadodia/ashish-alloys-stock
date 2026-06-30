import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET(req: Request) {
  const { error } = await requireSession();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const grade = searchParams.get("grade");
  const size = searchParams.get("size");
  const supplyCondition = searchParams.get("supplyCondition");
  const make = searchParams.get("make");
  const location = searchParams.get("location");
  const description = searchParams.get("description");

  const where: Record<string, unknown> = { active: true };
  if (grade) where.grade = grade;
  if (size) where.size = size;
  if (supplyCondition) where.supplyCondition = supplyCondition;
  if (make) where.make = make;
  if (location) where.location = location;
  if (description) where.description = description;

  const lots = await prisma.stockLot.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const suspense = await prisma.suspenseTotal.findMany({
    orderBy: { location: "asc" },
  });

  return NextResponse.json({ lots, suspense });
}
