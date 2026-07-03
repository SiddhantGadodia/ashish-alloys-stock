import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

type Section = { date: string; qty: number; supplyCondition: string; sizeFinal: string; locationFinal: string; subLocFinal?: string; suspenseQty: number; pieces?: number; remarks?: string };
type LotSection = { lotId: string; lotSnapshot: { grade: string; make: string; description: string; uidNo?: string; subLoc?: string; quantity: number; pieces?: number }; sections: Section[] };

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string; role: string };
  const body = await req.json();
  const existing = await prisma.finishedGoodsTransfer.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.stage === "verify") {
    if (user.role !== "verifier") return NextResponse.json({ error: "Verifier only" }, { status: 403 });
    if (existing.status !== "actuals_filled") return NextResponse.json({ error: "Not actuals_filled" }, { status: 409 });

    const lotSections: LotSection[] = JSON.parse(existing.lotSectionsJson || "[]");

    // Re-validate quantities
    for (const ls of lotSections) {
      const lot = await prisma.stockLot.findUnique({ where: { id: ls.lotId } });
      if (!lot) return NextResponse.json({ error: "Lot not found" }, { status: 404 });
      const total = ls.sections.reduce((s, sec) => s + (sec.qty || 0) + (sec.suspenseQty || 0), 0);
      if (total > lot.quantity + 0.001) {
        return NextResponse.json({ error: `Lot ${lot.grade} ${lot.size} has insufficient quantity` }, { status: 409 });
      }
    }

    const createdIds: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const ls of lotSections) {
        const totalDeduct = ls.sections.reduce((s, sec) => s + (sec.qty || 0) + (sec.suspenseQty || 0), 0);
        const srcLot = await tx.stockLot.findUnique({ where: { id: ls.lotId } });
        const remainingQty = (srcLot?.quantity ?? 0) - totalDeduct;
        const newLineage = [srcLot?.lineage, `F${existing.formNo}`].filter(Boolean).join(", ");
        await tx.stockLot.update({
          where: { id: ls.lotId },
          data: { quantity: { decrement: totalDeduct }, lineage: newLineage, ...(remainingQty <= 0.001 ? { active: false } : {}) },
        });

        const totalSuspense = ls.sections.reduce((s, sec) => s + (sec.suspenseQty || 0), 0);
        if (totalSuspense > 0) {
          await tx.suspenseTotal.upsert({
            where: { location: existing.locationInitial! },
            update: { total: { increment: totalSuspense } },
            create: { location: existing.locationInitial!, total: totalSuspense },
          });
        }

        const srcLineage = [srcLot?.lineage, `F${existing.formNo}`].filter(Boolean).join(", ");
        for (const sec of ls.sections) {
          if (sec.qty > 0) {
            const newLot = await tx.stockLot.create({
              data: {
                grade: ls.lotSnapshot.grade,
                make: ls.lotSnapshot.make,
                description: ls.lotSnapshot.description,
                uidNo: ls.lotSnapshot.uidNo || null,
                subLoc: sec.subLocFinal || null,
                size: sec.sizeFinal,
                supplyCondition: sec.supplyCondition,
                location: sec.locationFinal,
                quantity: sec.qty,
                pieces: sec.pieces ?? null,
                remarks: sec.remarks || null,
                lineage: srcLineage,
                dateCreated: new Date(sec.date),
                originForm: "finished_goods",
                originId: params.id,
              },
            });
            createdIds.push(newLot.id);
          }
        }
      }
      await tx.finishedGoodsTransfer.update({
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
  const existing = await prisma.finishedGoodsTransfer.findUnique({ where: { id: params.id } });
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
      const lotSections: LotSection[] = JSON.parse(existing.lotSectionsJson || "[]");
      for (const ls of lotSections) {
        const totalDeduct = ls.sections.reduce((s, sec) => s + (sec.qty || 0) + (sec.suspenseQty || 0), 0);
        await tx.stockLot.update({ where: { id: ls.lotId }, data: { quantity: { increment: totalDeduct } } });
        const totalSuspense = ls.sections.reduce((s, sec) => s + (sec.suspenseQty || 0), 0);
        if (totalSuspense > 0) {
          await tx.suspenseTotal.update({
            where: { location: existing.locationInitial! },
            data: { total: { decrement: totalSuspense } },
          });
        }
      }
    }
    await tx.correctionLog.create({
      data: { tableRef: "FinishedGoodsTransfer", recordId: params.id, field: "ALL", oldValue: JSON.stringify(existing), newValue: null, action: "delete", performedById: user.id },
    });
    await tx.finishedGoodsTransfer.delete({ where: { id: params.id } });
  });
  return NextResponse.json({ ok: true });
}
