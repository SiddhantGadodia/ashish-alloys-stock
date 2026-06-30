import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const entries = await prisma.finishedGoodsTransfer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      actualsFilledBy: { select: { name: true, role: true } },
      verifiedBy: { select: { name: true, role: true } },
    },
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string };
  const body = await req.json();
  const { date, gradeFinal, sizeFinal, quantityFinal, make, uidNo, pieces, supplyCondition, locationInitial, locationFinal, suspenseQty, remarks, sourceLotId } = body;

  if (!date || !gradeFinal || !sizeFinal || !quantityFinal || !make || !supplyCondition || !locationInitial || !locationFinal || !sourceLotId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const deduct = parseFloat(quantityFinal) + (parseFloat(suspenseQty) || 0);
  const lot = await prisma.stockLot.findUnique({ where: { id: sourceLotId } });
  if (!lot || lot.quantity < deduct) {
    return NextResponse.json({ error: "This lot does not have sufficient quantity remaining." }, { status: 409 });
  }

  const entry = await prisma.finishedGoodsTransfer.create({
    data: {
      status: "actuals_filled",
      date: new Date(date), gradeFinal, sizeFinal, quantityFinal: parseFloat(quantityFinal),
      make, uidNo: uidNo || null, pieces: pieces ? parseInt(pieces) : null,
      supplyCondition, locationInitial, locationFinal,
      suspenseQty: parseFloat(suspenseQty) || 0,
      remarks: remarks || null, sourceLotId,
      actualsFilledById: user.id, actualsFilledAt: new Date(),
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
