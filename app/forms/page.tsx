"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";

const FORMS = [
  { href: "/forms/purchase", label: "Purchase Entry", sub: "Form 0", desc: "Record new material arriving at a location. Creates a lot immediately.", color: "blue" },
  { href: "/forms/transfer", label: "Internal Transfer", sub: "Form 1", desc: "Move stock between locations. 3-stage: Instruction → Actuals → Verify.", color: "purple" },
  { href: "/forms/production", label: "Production Planning", sub: "Form 2", desc: "Instruct labour on processing. WhatsApp card only — no stock change.", color: "green" },
  { href: "/forms/finished", label: "Finished Goods Transfer", sub: "Form 3", desc: "Record processed goods returning. Actuals + Verify required.", color: "amber" },
  { href: "/forms/sales", label: "Sales", sub: "Form 4", desc: "Record goods dispatched to customer. 3-stage: Instruction → Actuals → Verify.", color: "red" },
];

const colorMap: Record<string, string> = {
  blue: "border-blue-200 bg-blue-50 hover:bg-blue-100",
  purple: "border-purple-200 bg-purple-50 hover:bg-purple-100",
  green: "border-green-200 bg-green-50 hover:bg-green-100",
  amber: "border-amber-200 bg-amber-50 hover:bg-amber-100",
  red: "border-red-200 bg-red-50 hover:bg-red-100",
};
const subColor: Record<string, string> = {
  blue: "text-blue-500", purple: "text-purple-500", green: "text-green-600", amber: "text-amber-600", red: "text-red-500",
};

export default function FormsPage() {
  const { status } = useSession();
  const router = useRouter();
  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);
  if (status === "loading") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Forms</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FORMS.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className={`border rounded-2xl p-5 transition block ${colorMap[f.color]}`}
            >
              <span className={`text-xs font-semibold uppercase tracking-wide ${subColor[f.color]}`}>{f.sub}</span>
              <h2 className="text-base font-bold mt-1 mb-2">{f.label}</h2>
              <p className="text-sm text-gray-600">{f.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
