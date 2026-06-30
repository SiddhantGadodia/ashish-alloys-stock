import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { error } = await requireSession();
  if (error) return error;
  const entry = await prisma.sale.findUnique({
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
  const existing = await prisma.sale.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (stage === "actuals") {
    if (existing.status !== "instruction") {
      return NextResponse.json({ error: "Can only fill actuals on instruction stage" }, { status: 409 });
    }
    const { date, grade, size, quantity, make, uidNo, pieces, supplyCondition, customer, vehicleNo, remarks, lotSelections } = body;
    if (!date || !grade || !size || !quantity || !make || !supplyCondition || !customer || !lotSelections?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const totalQty = parseFloat(quantity);
    const sumAssigned = lotSelections.reduce((s: number, l: { assignedQty: number }) => s + l.assignedQty, 0);
    if (Math.abs(sumAssigned - totalQty) > 0.001) {
      return NextResponse.json({ error: "Sum of lot assignments must equal actuals total quantity." }, { status: 409 });
    }
    for (const sel of lotSelections) {
      const lot = await prisma.stockLot.findUnique({ where: { id: sel.lotId } });
      if (!lot || lot.quantity < sel.assignedQty) {
        return NextResponse.json({ error: "This lot does not have sufficient quantity remaining." }, { status: 409 });
      }
    }
    await prisma.sale.update({
      where: { id: params.id },
      data: {
        status: "actuals_filled",
        actDate: new Date(date), actGrade: grade, actSize: size,
        actQuantity: totalQty, actMake: make,
        actUidNo: uidNo || null, actPieces: pieces ? parseInt(pieces) : null,
        actSupplyCondition: supplyCondition, actCustomer: customer,
        actVehicleNo: vehicleNo || null, actRemarks: remarks || null,
        lotSelections: JSON.stringify(lotSelections),
        actualsFilledById: user.id, actualsFilledAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (stage === "verify") {
    if (user.role !== "verifier") return NextResponse.json({ error: "Verifier only" }, { status: 403 });
    if (existing.status !== "actuals_filled") {
      return NextResponse.json({ error: "Can only verify actuals_filled" }, { status: 409 });
    }
    const lotSelections: { lotId: string; assignedQty: number }[] = JSON.parse(existing.lotSelections || "[]");
    for (const sel of lotSelections) {
      const lot = await prisma.stockLot.findUnique({ where: { id: sel.lotId } });
      if (!lot || lot.quantity < sel.assignedQty) {
        return NextResponse.json({ error: "This lot does not have sufficient quantity remaining." }, { status: 409 });
      }
    }
    await prisma.$transaction(async (tx) => {
      for (const sel of lotSelections) {
        await tx.stockLot.update({ where: { id: sel.lotId }, data: { quantity: { decrement: sel.assignedQty } } });
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
      const lotSelections: { lotId: string; assignedQty: number }[] = JSON.parse(existing.lotSelections || "[]");
      for (const sel of lotSelections) {
        await tx.stockLot.update({ where: { id: sel.lotId }, data: { quantity: { increment: sel.assignedQty } } });
      }
    }
    await tx.correctionLog.create({
      data: {
        tableRef: "Sale", recordId: params.id, field: "ALL",
        oldValue: JSON.stringify(existing), newValue: null,
        action: "delete", performedById: user.id,
      },
    });
    await tx.sale.delete({ where: { id: params.id } });
  });
  return NextResponse.json({ ok: true });
}
