import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireVerifier } from "@/lib/session";

type LotEntry = {
  lotId: string;
  lotSnapshot: { grade: string; size: string; supplyCondition: string; make: string; description: string; uidNo?: string; subLoc?: string; pieces?: number; quantity: number };
  detail: { date: string; qty: number; locationTo: string; pieces?: number; uidNo?: string; subLoc?: string; remarks?: string; jwNo?: string };
};

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string; role: string };
  const body = await req.json();
  const { stage } = body;
  const existing = await prisma.internalTransfer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (stage === "actuals") {
    if (existing.status !== "instruction") {
      return NextResponse.json({ error: "Can only fill actuals on instruction stage" }, { status: 409 });
    }
    const { locationFrom, lotsJson } = body;
    if (!locationFrom || !lotsJson?.length) {
      return NextResponse.json({ error: "Missing locationFrom or lots" }, { status: 400 });
    }
    for (const l of lotsJson as LotEntry[]) {
      const lot = await prisma.stockLot.findUnique({ where: { id: l.lotId } });
      if (!lot || lot.quantity < l.detail.qty) {
        return NextResponse.json({ error: `Lot has insufficient quantity` }, { status: 409 });
      }
    }
    await prisma.internalTransfer.update({
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
    const { error: vErr } = await requireVerifier();
    if (vErr) return vErr;
    if (existing.status !== "actuals_filled") {
      return NextResponse.json({ error: "Can only verify actuals_filled entries" }, { status: 409 });
    }
    const lots: LotEntry[] = JSON.parse(existing.actLotsJson || "[]");
    for (const l of lots) {
      const lot = await prisma.stockLot.findUnique({ where: { id: l.lotId } });
      if (!lot || lot.quantity < l.detail.qty) {
        return NextResponse.json({ error: `Lot has insufficient quantity` }, { status: 409 });
      }
    }
    const createdIds: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const l of lots) {
        const srcLot = await tx.stockLot.findUnique({ where: { id: l.lotId } });
        const remaining = (srcLot?.quantity ?? 0) - l.detail.qty;
        await tx.stockLot.update({
          where: { id: l.lotId },
          data: { quantity: { decrement: l.detail.qty }, ...(remaining <= 0.001 ? { active: false } : {}) },
        });
        const newLot = await tx.stockLot.create({
          data: {
            grade: l.lotSnapshot.grade,
            size: l.lotSnapshot.size,
            supplyCondition: l.lotSnapshot.supplyCondition,
            make: l.lotSnapshot.make,
            description: l.lotSnapshot.description,
            uidNo: l.detail.uidNo || l.lotSnapshot.uidNo || null,
            subLoc: l.detail.subLoc || l.lotSnapshot.subLoc || null,
            jwNo: l.detail.jwNo || null,
            pieces: l.detail.pieces ?? null,
            location: l.detail.locationTo,
            quantity: l.detail.qty,
            lineage: [srcLot?.lineage, `I${existing.formNo}`].filter(Boolean).join(", "),
            dateCreated: new Date(l.detail.date),
            originForm: "internal_transfer",
            originId: params.id,
          },
        });
        createdIds.push(newLot.id);
      }
      await tx.internalTransfer.update({
        where: { id: params.id },
        data: { status: "verified", verifiedById: user.id, verifiedAt: new Date(), createdLotIds: JSON.stringify(createdIds) },
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
  const existing = await prisma.internalTransfer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "verified" && user.role !== "verifier") {
    return NextResponse.json({ error: "Only verifiers can delete verified entries" }, { status: 403 });
  }
  await prisma.$transaction(async (tx) => {
    if (existing.status === "verified") {
      const createdIds: string[] = JSON.parse(existing.createdLotIds || "[]");
      for (const id of createdIds) {
        await tx.stockLot.update({ where: { id }, data: { active: false } });
      }
      const lots: LotEntry[] = JSON.parse(existing.actLotsJson || "[]");
      for (const l of lots) {
        await tx.stockLot.update({ where: { id: l.lotId }, data: { quantity: { increment: l.detail.qty } } });
      }
    }
    await tx.correctionLog.create({
      data: { tableRef: "InternalTransfer", recordId: params.id, field: "ALL", oldValue: JSON.stringify(existing), newValue: null, action: "delete", performedById: user.id },
    });
    await tx.internalTransfer.delete({ where: { id: params.id } });
  });
  return NextResponse.json({ ok: true });
}
