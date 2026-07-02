import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const entries = await prisma.purchaseEntry.findMany({
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

  const { date, grade, size, supplyCondition, pieces, make, quantity, length, description, location, uidNo, subLoc, remarks } = body;

  if (!date || !grade || !size || !supplyCondition || !make || !quantity || !description || !location) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const entry = await prisma.$transaction(async (tx) => {
    const e = await tx.purchaseEntry.create({
      data: {
        date: new Date(date),
        grade, size, supplyCondition,
        pieces: pieces ? parseInt(pieces) : null,
        make, quantity: parseFloat(quantity),
        length: length ? parseFloat(length) : null,
        description, location,
        uidNo: uidNo || null,
        subLoc: subLoc || null,
        remarks: remarks || null,
        createdById: user.id,
      },
    });
    const lot = await tx.stockLot.create({
      data: {
        grade, size, supplyCondition, make, location,
        pieces: pieces ? parseInt(pieces) : null,
        quantity: parseFloat(quantity),
        length: length ? parseFloat(length) : null,
        description,
        uidNo: uidNo || null,
        subLoc: subLoc || null,
        remarks: remarks || null,
        dateCreated: new Date(date),
        originForm: "purchase",
        originId: e.id,
      },
    });
    await tx.purchaseEntry.update({ where: { id: e.id }, data: { stockLotId: lot.id } });
    return { ...e, stockLotId: lot.id };
  });

  return NextResponse.json(entry, { status: 201 });
}
