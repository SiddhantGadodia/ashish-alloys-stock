import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

type LotEntry = {
  lotId: string;
  lotSnapshot: { grade: string; size: string; supplyCondition: string; make: string; subLoc?: string; uidNo?: string; pieces?: number; quantity: number };
  detail: { customer: string; qty: number; vehicleNo?: string; pieces?: number; remarks?: string };
};

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string; role: string };
  const body = await req.json();
  const { stage } = body;
  const existing = await prisma.sale.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (stage === "actuals") {
    if (existing.status !== "instruction") {
      return NextResponse.json({ error: "Can only fill actuals on instruction stage" }, { status: 409 });
    }
    const { locationFrom, lotsJson } = body;
    if (!locationFrom || !lotsJson?.length) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    for (const l of lotsJson as LotEntry[]) {
      const lot = await prisma.stockLot.findUnique({ where: { id: l.lotId } });
      if (!lot || lot.quantity < l.detail.qty) {
        return NextResponse.json({ error: "Lot has insufficient quantity" }, { status: 409 });
      }
    }
    await prisma.sale.update({
      where: { id: params.id },
      data: {
        status: "actuals_filled",
        locationFrom,
        actLotsJson: JSON.stringify(lotsJson),
        actualsFilledById: user.id,
        actualsFilledAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (stage === "verify") {
    if (user.role !== "verifier") return NextResponse.json({ error: "Verifier only" }, { status: 403 });
    if (existing.status !== "actuals_filled") return NextResponse.json({ error: "Not actuals_filled" }, { status: 409 });

    const lots: LotEntry[] = JSON.parse(existing.actLotsJson || "[]");
    for (const l of lots) {
      const lot = await prisma.stockLot.findUnique({ where: { id: l.lotId } });
      if (!lot || lot.quantity < l.detail.qty) {
        return NextResponse.json({ error: "Lot has insufficient quantity" }, { status: 409 });
      }
    }
    await prisma.$transaction(async (tx) => {
      for (const l of lots) {
        const srcLot = await tx.stockLot.findUnique({ where: { id: l.lotId } });
        const remaining = (srcLot?.quantity ?? 0) - l.detail.qty;
        await tx.stockLot.update({
          where: { id: l.lotId },
          data: { quantity: { decrement: l.detail.qty }, ...(remaining <= 0.001 ? { active: false } : {}) },
        });
      }
      await tx.sale.update({
        where: { id: params.id },
        data: { status: "verified", verifiedById: user.id, verifiedAt: new Date() },
      });
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string; role: string };
  const existing = await prisma.sale.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "verified" && user.role !== "verifier") {
    return NextResponse.json({ error: "Only verifiers can delete verified entries" }, { status: 403 });
  }
  await prisma.$transaction(async (tx) => {
    if (existing.status === "verified") {
      const lots: LotEntry[] = JSON.parse(existing.actLotsJson || "[]");
      for (const l of lots) {
        await tx.stockLot.update({ where: { id: l.lotId }, data: { quantity: { increment: l.detail.qty } } });
      }
    }
    await tx.correctionLog.create({
      data: { tableRef: "Sale", recordId: params.id, field: "ALL", oldValue: JSON.stringify(existing), newValue: null, action: "delete", performedById: user.id },
    });
    await tx.sale.delete({ where: { id: params.id } });
  });
  return NextResponse.json({ ok: true });
}
