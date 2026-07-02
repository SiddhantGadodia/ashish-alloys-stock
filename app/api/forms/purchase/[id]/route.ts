import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { error } = await requireSession();
  if (error) return error;
  const entry = await prisma.purchaseEntry.findUnique({
    where: { id: params.id },
    include: { createdBy: { select: { name: true, role: true } } },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string };
  const body = await req.json();

  const existing = await prisma.purchaseEntry.findUnique({
    where: { id: params.id },
    include: { createdBy: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { date, grade, size, supplyCondition, pieces, make, quantity, length, description, location, uidNo, subLoc, remarks } = body;
  const newQty = parseFloat(quantity);

  // No-negative check: if qty reduced, make sure lot still has enough
  if (existing.stockLotId) {
    const lot = await prisma.stockLot.findUnique({ where: { id: existing.stockLotId } });
    if (lot) {
      const consumed = existing.quantity - lot.quantity;
      if (newQty < consumed) {
        return NextResponse.json({ error: "This lot does not have sufficient quantity remaining." }, { status: 409 });
      }
    }
  }

  // Log corrections
  const fields = ["date","grade","size","supplyCondition","pieces","make","quantity","length","description","location","uidNo","subLoc","remarks"];
  const logs = fields
    .filter((f) => String((existing as Record<string, unknown>)[f] ?? "") !== String(body[f] ?? ""))
    .map((f) => ({
      tableRef: "PurchaseEntry", recordId: params.id, field: f,
      oldValue: String((existing as Record<string, unknown>)[f] ?? ""),
      newValue: String(body[f] ?? ""),
      action: "edit", performedById: user.id,
    }));

  await prisma.$transaction([
    prisma.purchaseEntry.update({
      where: { id: params.id },
      data: {
        date: new Date(date), grade, size, supplyCondition,
        pieces: pieces ? parseInt(pieces) : null,
        make, quantity: newQty,
        length: length ? parseFloat(length) : null,
        description, location, uidNo: uidNo || null, subLoc: subLoc || null, remarks: remarks || null,
      },
    }),
    ...(existing.stockLotId
      ? [prisma.stockLot.update({
          where: { id: existing.stockLotId },
          data: {
            grade, size, supplyCondition, make, location,
            pieces: pieces ? parseInt(pieces) : null,
            quantity: newQty,
            length: length ? parseFloat(length) : null,
            description, uidNo: uidNo || null, subLoc: subLoc || null, remarks: remarks || null,
            dateCreated: new Date(date),
          },
        })]
      : []),
    ...logs.map((l) => prisma.correctionLog.create({ data: l })),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string };

  const existing = await prisma.purchaseEntry.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.stockLotId) {
    const lot = await prisma.stockLot.findUnique({ where: { id: existing.stockLotId } });
    if (lot && lot.quantity < existing.quantity) {
      return NextResponse.json({ error: "This lot does not have sufficient quantity remaining." }, { status: 409 });
    }
  }

  await prisma.$transaction([
    prisma.correctionLog.create({
      data: {
        tableRef: "PurchaseEntry", recordId: params.id, field: "ALL",
        oldValue: JSON.stringify(existing), newValue: null,
        action: "delete", performedById: user.id,
      },
    }),
    ...(existing.stockLotId
      ? [prisma.stockLot.update({ where: { id: existing.stockLotId }, data: { active: false } })]
      : []),
    prisma.purchaseEntry.delete({ where: { id: params.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
