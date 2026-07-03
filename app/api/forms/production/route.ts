import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const entries = await prisma.productionPlanning.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { name: true } },
      actualsFilledBy: { select: { name: true } },
      verifiedBy: { select: { name: true } },
    },
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string };
  const body = await req.json();
  const { stage, locationInitial, lotSections } = body;

  if (!locationInitial || !lotSections?.length) {
    return NextResponse.json({ error: "Missing locationInitial or lots" }, { status: 400 });
  }

  if (stage === "instruction") {
    for (const ls of lotSections) {
      const lot = await prisma.stockLot.findUnique({ where: { id: ls.lotId } });
      if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 });
      const total = ls.sections.reduce((s: number, sec: { qty: number }) => s + (sec.qty || 0), 0);
      if (total > lot.quantity + 0.001) {
        return NextResponse.json({ error: `Total qty for ${lot.grade} ${lot.size} exceeds available ${lot.quantity}` }, { status: 409 });
      }
    }
    const entry = await prisma.productionPlanning.create({
      data: { status: "instruction", entryType: "instruction", locationInitial, lotSectionsJson: JSON.stringify(lotSections), createdById: user.id },
    });
    return NextResponse.json(entry, { status: 201 });
  }

  if (stage === "direct_actuals") {
    for (const ls of lotSections) {
      const lot = await prisma.stockLot.findUnique({ where: { id: ls.lotId } });
      if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 });
      const total = ls.sections.reduce((s: number, sec: { qty: number }) => s + (sec.qty || 0), 0);
      if (total > lot.quantity + 0.001) {
        return NextResponse.json({ error: `Total qty for ${lot.grade} ${lot.size} exceeds available ${lot.quantity}` }, { status: 409 });
      }
    }
    const entry = await prisma.productionPlanning.create({
      data: { status: "actuals_filled", entryType: "direct", locationInitial, actLotsJson: JSON.stringify(lotSections), createdById: user.id, actualsFilledById: user.id, actualsFilledAt: new Date() },
    });
    return NextResponse.json(entry, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
}
