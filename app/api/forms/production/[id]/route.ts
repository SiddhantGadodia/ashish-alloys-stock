import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const { error } = await requireSession();
  if (error) return error;
  const entry = await prisma.productionPlanning.findUnique({
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
  const { date, grade, rmSize, quantity, make, conversionSizeTolerance, length, colourCode, machines, additionalInstruction, uidNo } = body;
  const existing = await prisma.productionPlanning.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.productionPlanning.update({
      where: { id: params.id },
      data: {
        date: new Date(date), grade, rmSize, quantity: parseFloat(quantity), make,
        conversionSizeTolerance, length: parseFloat(length), colourCode,
        machines: JSON.stringify(machines),
        additionalInstruction: additionalInstruction || null, uidNo: uidNo || null,
      },
    }),
    prisma.correctionLog.create({
      data: {
        tableRef: "ProductionPlanning", recordId: params.id, field: "ALL",
        oldValue: JSON.stringify(existing), newValue: JSON.stringify(body),
        action: "edit", performedById: user.id,
      },
    }),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string };
  const existing = await prisma.productionPlanning.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.$transaction([
    prisma.correctionLog.create({
      data: {
        tableRef: "ProductionPlanning", recordId: params.id, field: "ALL",
        oldValue: JSON.stringify(existing), newValue: null,
        action: "delete", performedById: user.id,
      },
    }),
    prisma.productionPlanning.delete({ where: { id: params.id } }),
  ]);
  return NextResponse.json({ ok: true });
}
