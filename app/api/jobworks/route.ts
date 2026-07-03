import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  // All lots that have a JW number (created by IT verify with JW checkbox)
  const jwLots = await prisma.stockLot.findMany({
    where: { jwNo: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  if (jwLots.length === 0) return NextResponse.json({ entries: [] });

  // All verified FG transfers — check if any used a jw lot as source
  const fgTransfers = await prisma.finishedGoodsTransfer.findMany({
    where: { status: "verified" },
  });

  const jwLotIds = new Set(jwLots.map((l) => l.id));
  const lotToFgCreatedIds: Record<string, string[]> = {};

  for (const fgt of fgTransfers) {
    const sections = JSON.parse(fgt.lotSectionsJson || "[]") as { lotId: string }[];
    const createdIds = JSON.parse(fgt.createdLotIds || "[]") as string[];
    for (const sec of sections) {
      if (jwLotIds.has(sec.lotId) && createdIds.length > 0) {
        lotToFgCreatedIds[sec.lotId] = createdIds;
      }
    }
  }

  // Fetch all FG-created lots in one query
  const allFgIds = [...new Set(Object.values(lotToFgCreatedIds).flat())];
  const fgCreatedLots = allFgIds.length > 0
    ? await prisma.stockLot.findMany({ where: { id: { in: allFgIds } } })
    : [];

  // Group by jwNo
  const jwNoMap: Record<string, { type: string; lot: typeof jwLots[0] }[]> = {};
  for (const lot of jwLots) {
    const jw = lot.jwNo!;
    if (!jwNoMap[jw]) jwNoMap[jw] = [];
    jwNoMap[jw].push({ type: "transferred", lot });
    for (const id of lotToFgCreatedIds[lot.id] || []) {
      const fgLot = fgCreatedLots.find((l) => l.id === id);
      if (fgLot) jwNoMap[jw].push({ type: "finished", lot: fgLot });
    }
  }

  const entries = Object.entries(jwNoMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([jwNo, rows]) => ({ jwNo, rows }));

  return NextResponse.json({ entries });
}
