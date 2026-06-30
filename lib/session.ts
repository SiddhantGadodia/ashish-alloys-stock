import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireVerifier() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string; name: string; role: string } | undefined;
  if (!user) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (user.role !== "verifier") {
    return { session: null, error: NextResponse.json({ error: "Verifier only" }, { status: 403 }) };
  }
  return { session, error: null };
}
