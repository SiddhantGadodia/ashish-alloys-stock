import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const entries = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      instructedBy: { select: { name: true, role: true } },
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
  const { stage, locationFrom, lotsJson } = body;

  if (!locationFrom || !lotsJson?.length) {
    return NextResponse.json({ error: "Missing locationFrom or lots" }, { status: 400 });
  }

  if (stage === "instruction") {
    const entry = await prisma.sale.create({
      data: {
        status: "instruction",
        entryType: "instruction",
        locationFrom,
        instrLotsJson: JSON.stringify(lotsJson),
        instructedById: user.id,
        instructedAt: new Date(),
      },
    });
    return NextResponse.json(entry, { status: 201 });
  }

  if (stage === "direct_actuals") {
    for (const l of lotsJson) {
      const lot = await prisma.stockLot.findUnique({ where: { id: l.lotId } });
      if (!lot || lot.quantity < l.detail.qty) {
        return NextResponse.json({ error: `Lot has insufficient quantity` }, { status: 409 });
      }
    }
    const entry = await prisma.sale.create({
      data: {
        status: "actuals_filled",
        entryType: "direct",
        locationFrom,
        actLotsJson: JSON.stringify(lotsJson),
        actualsFilledById: user.id,
        actualsFilledAt: new Date(),
      },
    });
    return NextResponse.json(entry, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
}
