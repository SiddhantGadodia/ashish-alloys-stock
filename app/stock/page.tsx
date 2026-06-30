"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

interface StockLot {
  id: string;
  grade: string;
  size: string;
  supplyCondition: string;
  make: string;
  location: string;
  pieces: number | null;
  quantity: number;
  length: number | null;
  description: string;
  uidNo: string | null;
  remarks: string | null;
  dateCreated: string;
  originForm: string;
}

interface SuspenseTotal {
  id: string;
  location: string;
  total: number;
}

const TABS = ["All Lots", "By Form", "Suspense"] as const;
type Tab = typeof TABS[number];

export default function StockPage() {
  const { status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("All Lots");
  const [lots, setLots] = useState<StockLot[]>([]);
  const [suspense, setSuspense] = useState<SuspenseTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ grade: "", size: "", supplyCondition: "", make: "", location: "", description: "" });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    setLoading(true);
    fetch(`/api/stock?${params}`)
      .then((r) => r.json())
      .then((d) => { setLots(d.lots || []); setSuspense(d.suspense || []); setLoading(false); });
  }, [status, filters]);

  if (status === "loading") return null;

  const filterField = (label: string, key: keyof typeof filters) => (
    <div key={key} className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input
        value={filters[key]}
        onChange={(e) => setFilters((f) => ({ ...f, [key]: e.target.value }))}
        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={`Filter ${label}`}
      />
    </div>
  );

  const byForm = (form: string) => lots.filter((l) => l.originForm === form);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Stock Database</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {(tab === "All Lots" || tab === "By Form") && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Filters</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {filterField("Grade", "grade")}
              {filterField("Size", "size")}
              {filterField("Supply Cond.", "supplyCondition")}
              {filterField("Make", "make")}
              {filterField("Location", "location")}
              {filterField("Description", "description")}
            </div>
          </div>
        )}

        {tab === "All Lots" && (
          <LotTable lots={lots} loading={loading} />
        )}

        {tab === "By Form" && (
          <div className="space-y-8">
            {[
              { key: "purchase", label: "Purchase Entries" },
              { key: "internal_transfer", label: "Internal Transfers" },
              { key: "finished_goods", label: "Finished Goods" },
            ].map(({ key, label }) => (
              <div key={key}>
                <h2 className="text-lg font-semibold mb-3 text-gray-700">{label}</h2>
                <LotTable lots={byForm(key)} loading={loading} />
              </div>
            ))}
          </div>
        )}

        {tab === "Suspense" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-amber-50">
              <h2 className="text-base font-semibold text-amber-800">Suspense Totals by Location</h2>
              <p className="text-xs text-amber-600 mt-0.5">Running unaccounted quantities from Finished Goods processing</p>
            </div>
            {suspense.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">No suspense recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600">Location</th>
                    <th className="px-4 py-3 font-medium text-gray-600 text-right">Suspense Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {suspense.map((s) => (
                    <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{s.location}</td>
                      <td className="px-4 py-3 text-right text-amber-700 font-semibold">{s.total.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LotTable({ lots, loading }: { lots: StockLot[]; loading: boolean }) {
  if (loading) return <p className="text-center text-gray-400 py-10 text-sm">Loading...</p>;
  if (lots.length === 0) return <p className="text-center text-gray-400 py-10 text-sm">No lots found.</p>;
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-gray-50 text-left">
          <tr>
            {["Date","Grade","Size","Supply Cond.","Make","Description","Location","Pieces","Qty","Length","UID No.","Remarks"].map((h) => (
              <th key={h} className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lots.map((lot) => (
            <tr key={lot.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap">{new Date(lot.dateCreated).toLocaleDateString("en-IN")}</td>
              <td className="px-3 py-2 font-medium">{lot.grade}</td>
              <td className="px-3 py-2">{lot.size}</td>
              <td className="px-3 py-2">{lot.supplyCondition}</td>
              <td className="px-3 py-2">{lot.make}</td>
              <td className="px-3 py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lot.description === "Prime" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {lot.description}
                </span>
              </td>
              <td className="px-3 py-2">{lot.location}</td>
              <td className="px-3 py-2 text-right">{lot.pieces ?? "—"}</td>
              <td className="px-3 py-2 text-right font-semibold">{lot.quantity.toFixed(3)}</td>
              <td className="px-3 py-2 text-right">{lot.length ?? "—"}</td>
              <td className="px-3 py-2">{lot.uidNo ?? "—"}</td>
              <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">{lot.remarks ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
