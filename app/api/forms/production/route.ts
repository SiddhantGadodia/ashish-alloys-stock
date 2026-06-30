import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const entries = await prisma.productionPlanning.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true, role: true } } },
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string };
  const body = await req.json();
  const { date, grade, rmSize, quantity, make, conversionSizeTolerance, length, colourCode, machines, additionalInstruction, uidNo } = body;
  if (!date || !grade || !rmSize || !quantity || !make || !conversionSizeTolerance || !length || !colourCode || !machines?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const entry = await prisma.productionPlanning.create({
    data: {
      date: new Date(date), grade, rmSize, quantity: parseFloat(quantity), make,
      conversionSizeTolerance, length: parseFloat(length), colourCode,
      machines: JSON.stringify(machines),
      additionalInstruction: additionalInstruction || null,
      uidNo: uidNo || null, createdById: user.id,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
