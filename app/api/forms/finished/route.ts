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
  const { locationInitial, lotSections } = body;

  if (!locationInitial || !lotSections?.length) {
    return NextResponse.json({ error: "Missing locationInitial or lots" }, { status: 400 });
  }

  // Validate each lot: sum(section qty + suspense) <= lot quantity
  for (const lotSec of lotSections) {
    const lot = await prisma.stockLot.findUnique({ where: { id: lotSec.lotId } });
    if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 });
    const total = lotSec.sections.reduce((s: number, sec: { qty: number; suspenseQty: number }) => s + (sec.qty || 0) + (sec.suspenseQty || 0), 0);
    if (total > lot.quantity + 0.001) {
      return NextResponse.json({ error: `Total quantity for lot ${lot.grade} ${lot.size} exceeds available ${lot.quantity}` }, { status: 409 });
    }
  }

  const entry = await prisma.finishedGoodsTransfer.create({
    data: {
      status: "actuals_filled",
      locationInitial,
      lotSectionsJson: JSON.stringify(lotSections),
      actualsFilledById: user.id,
      actualsFilledAt: new Date(),
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
