import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { error } = await requireSession();
  if (error) return error;
  const entry = await prisma.finishedGoodsTransfer.findUnique({
    where: { id: params.id },
    include: {
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
  const existing = await prisma.finishedGoodsTransfer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (stage === "verify") {
    if (user.role !== "verifier") return NextResponse.json({ error: "Verifier only" }, { status: 403 });
    if (existing.status !== "actuals_filled") {
      return NextResponse.json({ error: "Can only verify actuals_filled" }, { status: 409 });
    }
    const deduct = existing.quantityFinal + existing.suspenseQty;
    const lot = await prisma.stockLot.findUnique({ where: { id: existing.sourceLotId! } });
    if (!lot || lot.quantity < deduct) {
      return NextResponse.json({ error: "This lot does not have sufficient quantity remaining." }, { status: 409 });
    }
    await prisma.$transaction(async (tx) => {
      await tx.stockLot.update({ where: { id: existing.sourceLotId! }, data: { quantity: { decrement: deduct } } });
      const newLot = await tx.stockLot.create({
        data: {
          grade: existing.gradeFinal, size: existing.sizeFinal,
          supplyCondition: existing.supplyCondition, make: existing.make,
          location: existing.locationFinal, quantity: existing.quantityFinal,
          pieces: existing.pieces, description: "Prime",
          uidNo: existing.uidNo, subLoc: (existing as { subLocFinal?: string | null }).subLocFinal || null, dateCreated: existing.date,
          originForm: "finished_goods", originId: params.id,
        },
      });
      if (existing.suspenseQty > 0) {
        await tx.suspenseTotal.upsert({
          where: { location: existing.locationInitial },
          update: { total: { increment: existing.suspenseQty } },
          create: { location: existing.locationInitial, total: existing.suspenseQty },
        });
      }
      await tx.finishedGoodsTransfer.update({
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
  const existing = await prisma.finishedGoodsTransfer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "verified" && user.role !== "verifier") {
    return NextResponse.json({ error: "Only verifiers can delete verified entries" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    if (existing.status === "verified") {
      if (existing.createdLotId) {
        await tx.stockLot.update({ where: { id: existing.createdLotId }, data: { active: false } });
      }
      await tx.stockLot.update({
        where: { id: existing.sourceLotId! },
        data: { quantity: { increment: existing.quantityFinal + existing.suspenseQty } },
      });
      if (existing.suspenseQty > 0) {
        await tx.suspenseTotal.update({
          where: { location: existing.locationInitial },
          data: { total: { decrement: existing.suspenseQty } },
        });
      }
    }
    await tx.correctionLog.create({
      data: {
        tableRef: "FinishedGoodsTransfer", recordId: params.id, field: "ALL",
        oldValue: JSON.stringify(existing), newValue: null,
        action: "delete", performedById: user.id,
      },
    });
    await tx.finishedGoodsTransfer.delete({ where: { id: params.id } });
  });
  return NextResponse.json({ ok: true });
}
