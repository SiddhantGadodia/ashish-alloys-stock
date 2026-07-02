import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;
  const entries = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      instructedBy: { select: { name: true, role: true } },
      actualsFilledBy: { select: { name: true, role: true } },
      verifiedBy: { select: { name: true, role: true } },
    },
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const { session, error } = await requireSession();
  if (error) return error;
  const user = session!.user as { id: string };
  const body = await req.json();
  const { stage } = body;

  if (stage === "instruction") {
    const { date, grade, size, quantity, make, uidNo, pieces, subLoc, supplyCondition, customer, vehicleNo, remarks } = body;
    if (!date || !grade || !size || !quantity || !make || !supplyCondition || !customer) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const entry = await prisma.sale.create({
      data: {
        status: "instruction",
        instrDate: new Date(date), instrGrade: grade, instrSize: size,
        instrQuantity: parseFloat(quantity), instrMake: make,
        instrUidNo: uidNo || null, instrPieces: pieces ? parseInt(pieces) : null,
        instrSubLoc: subLoc || null,
        instrSupplyCondition: supplyCondition, instrCustomer: customer,
        instrVehicleNo: vehicleNo || null, instrRemarks: remarks || null,
        instructedById: user.id, instructedAt: new Date(),
      },
    });
    return NextResponse.json(entry, { status: 201 });
  }

  return NextResponse.json({ error: "Invalid stage" }, { status: 400 });
}
