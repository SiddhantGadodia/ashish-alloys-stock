import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireVerifier } from "@/lib/session";

export async function GET(req: Request) {
  const { error } = await requireSession();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const field = searchParams.get("field");
  const where = field ? { field, active: true } : { active: true };
  const options = await prisma.dropdownOption.findMany({ where, orderBy: { value: "asc" } });
  return NextResponse.json(options);
}

export async function POST(req: Request) {
  const { error } = await requireSession();
  if (error) return error;
  const { field, value } = await req.json();
  if (!field || !value) return NextResponse.json({ error: "field and value required" }, { status: 400 });
  const opt = await prisma.dropdownOption.upsert({
    where: { field_value: { field, value } },
    update: { active: true },
    create: { field, value, isSystem: false },
  });
  return NextResponse.json(opt);
}

export async function DELETE(req: Request) {
  const { error } = await requireVerifier();
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const opt = await prisma.dropdownOption.findUnique({ where: { id } });
  if (!opt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (opt.isSystem) return NextResponse.json({ error: "Cannot delete system option" }, { status: 403 });
  await prisma.dropdownOption.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
