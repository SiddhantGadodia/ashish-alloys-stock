import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireVerifier } from "@/lib/session";

type ActSection = { date: string; machine: string; sizeFinal: string; supplyConditionFinal: string; qty: number; lengthFinal: number; remarks: string };
type ActLot = { lotId: string; lotSnapshot: { grade: string; size: string; supplyCondition: string; make: string; description: string; location: string; subLoc?: string; quantity: number }; sections: ActSection[] };

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string; role: string };
  const body = await req.json();
  const { stage } = body;
  const existing = await prisma.productionPlanning.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (stage === "actuals") {
    if (existing.status !== "instruction") {
      return NextResponse.json({ error: "Can only fill actuals on instruction entries" }, { status: 409 });
    }
    const { locationInitial, lotSections } = body;
    if (!locationInitial || !lotSections?.length) {
      return NextResponse.json({ error: "Missing locationInitial or lots" }, { status: 400 });
    }
    for (const ls of lotSections as ActLot[]) {
      const lot = await prisma.stockLot.findUnique({ where: { id: ls.lotId } });
      if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 });
      const total = ls.sections.reduce((s, sec) => s + (sec.qty || 0), 0);
      if (total > lot.quantity + 0.001) {
        return NextResponse.json({ error: `Total qty for ${lot.grade} ${lot.size} exceeds available ${lot.quantity}` }, { status: 409 });
      }
    }
    await prisma.productionPlanning.update({
      where: { id: params.id },
      data: { status: "actuals_filled", locationInitial, actLotsJson: JSON.stringify(lotSections), actualsFilledById: user.id, actualsFilledAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (stage === "verify") {
    const { error: vErr } = await requireVerifier();
    if (vErr) return vErr;
    if (existing.status !== "actuals_filled") {
      return NextResponse.json({ error: "Can only verify actuals_filled entries" }, { status: 409 });
    }
    const lots: ActLot[] = JSON.parse(existing.actLotsJson || "[]");
    for (const ls of lots) {
      const lot = await prisma.stockLot.findUnique({ where: { id: ls.lotId } });
      if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 });
      const total = ls.sections.reduce((s, sec) => s + (sec.qty || 0), 0);
      if (total > lot.quantity + 0.001) {
        return NextResponse.json({ error: `Lot ${lot.grade} ${lot.size} has insufficient quantity` }, { status: 409 });
      }
    }
    await prisma.productionPlanning.update({
      where: { id: params.id },
      data: { status: "verified", verifiedById: user.id, verifiedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string; role: string };
  const existing = await prisma.productionPlanning.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "verified" && user.role !== "verifier") {
    return NextResponse.json({ error: "Only verifiers can delete verified entries" }, { status: 403 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.correctionLog.create({
      data: { tableRef: "ProductionPlanning", recordId: params.id, field: "ALL", oldValue: JSON.stringify(existing), newValue: null, action: "delete", performedById: user.id },
    });
    await tx.productionPlanning.delete({ where: { id: params.id } });
  });
  return NextResponse.json({ ok: true });
}
