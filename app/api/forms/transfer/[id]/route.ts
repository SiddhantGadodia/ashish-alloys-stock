import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireVerifier } from "@/lib/session";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { error } = await requireSession();
  if (error) return error;
  const entry = await prisma.internalTransfer.findUnique({
    where: { id: params.id },
    include: {
      instructedBy: { select: { name: true, role: true } },
      actualsFilledBy: { select: { name: true, role: true } },
      verifiedBy: { select: { name: true, role: true } },
    },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

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
    const { date, grade, size, quantity, make, uidNo, pieces, subLoc, supplyCondition, locationFrom, locationTo, remarks, description, lotSelections } = body;
    if (!date || !grade || !size || !quantity || !make || !supplyCondition || !locationFrom || !locationTo || !lotSelections?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const totalQty = parseFloat(quantity);
    const sumAssigned = lotSelections.reduce((s: number, l: { assignedQty: number }) => s + l.assignedQty, 0);
    if (Math.abs(sumAssigned - totalQty) > 0.001) {
      return NextResponse.json({ error: "Sum of lot assignments must equal actuals total quantity." }, { status: 409 });
    }
    // Check each lot
    for (const sel of lotSelections) {
      const lot = await prisma.stockLot.findUnique({ where: { id: sel.lotId } });
      if (!lot || lot.quantity < sel.assignedQty) {
        return NextResponse.json({ error: "This lot does not have sufficient quantity remaining." }, { status: 409 });
      }
    }
    await prisma.internalTransfer.update({
      where: { id: params.id },
      data: {
        status: "actuals_filled",
        actDate: new Date(date), actGrade: grade, actSize: size,
        actQuantity: totalQty, actMake: make,
        actUidNo: uidNo || null, actPieces: pieces ? parseInt(pieces) : null,
        actSubLoc: subLoc || null,
        actSupplyCondition: supplyCondition, actLocationFrom: locationFrom,
        actLocationTo: locationTo, actRemarks: remarks || null,
        actDescription: description || null,
        lotSelections: JSON.stringify(lotSelections),
        actualsFilledById: user.id, actualsFilledAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (stage === "verify") {
    if (user.role !== "verifier") return NextResponse.json({ error: "Verifier only" }, { status: 403 });
    if (existing.status !== "actuals_filled") {
      return NextResponse.json({ error: "Can only verify actuals_filled entries" }, { status: 409 });
    }
    const lotSelections: { lotId: string; assignedQty: number }[] = JSON.parse(existing.lotSelections || "[]");
    // Final no-negative check
    for (const sel of lotSelections) {
      const lot = await prisma.stockLot.findUnique({ where: { id: sel.lotId } });
      if (!lot || lot.quantity < sel.assignedQty) {
        return NextResponse.json({ error: "This lot does not have sufficient quantity remaining." }, { status: 409 });
      }
    }
    await prisma.$transaction(async (tx) => {
      for (const sel of lotSelections) {
        await tx.stockLot.update({
          where: { id: sel.lotId },
          data: { quantity: { decrement: sel.assignedQty } },
        });
      }
      const newLot = await tx.stockLot.create({
        data: {
          grade: existing.actGrade!, size: existing.actSize!,
          supplyCondition: existing.actSupplyCondition!, make: existing.actMake!,
          location: existing.actLocationTo!, quantity: existing.actQuantity!,
          pieces: existing.actPieces, description: existing.actDescription || "Prime",
          uidNo: existing.actUidNo, subLoc: existing.actSubLoc || null, dateCreated: existing.actDate!,
          originForm: "internal_transfer", originId: params.id,
        },
      });
      await tx.internalTransfer.update({
        where: { id: params.id },
        data: { status: "verified", verifiedById: user.id, verifiedAt: new Date(), createdLotId: newLot.id },
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
      // Reverse: remove created lot, restore source lots
      if (existing.createdLotId) {
        await tx.stockLot.update({ where: { id: existing.createdLotId }, data: { active: false } });
      }
      const lotSelections: { lotId: string; assignedQty: number }[] = JSON.parse(existing.lotSelections || "[]");
      for (const sel of lotSelections) {
        await tx.stockLot.update({ where: { id: sel.lotId }, data: { quantity: { increment: sel.assignedQty } } });
      }
    }
    await tx.correctionLog.create({
      data: {
        tableRef: "InternalTransfer", recordId: params.id, field: "ALL",
        oldValue: JSON.stringify(existing), newValue: null,
        action: "delete", performedById: user.id,
      },
    });
    await tx.internalTransfer.delete({ where: { id: params.id } });
  });

  return NextResponse.json({ ok: true });
}
