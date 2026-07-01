"use client";
import { useEffect, useState, useRef } from "react";
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

const COL_KEYS = ["grade", "size", "supplyCondition", "make", "location", "description"] as const;
type ColKey = typeof COL_KEYS[number];
const COL_LABELS: Record<ColKey, string> = { grade: "Grade", size: "Size", supplyCondition: "Supply Cond.", make: "Make", location: "Location", description: "Description" };

function distinct(lots: StockLot[], key: ColKey): string[] {
  return Array.from(new Set(lots.map((l) => l[key] ?? "").filter(Boolean))).sort();
}

function ColumnFilter({ label, values, selected, onChange }: { label: string; values: string[]; selected: Set<string>; onChange: (s: Set<string>) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allSelected = values.every((v) => selected.has(v));
  const someSelected = !allSelected && values.some((v) => selected.has(v));
  const active = !allSelected;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleAll() {
    onChange(allSelected ? new Set() : new Set(values));
  }
  function toggle(v: string) {
    const next = new Set(selected);
    next.has(v) ? next.delete(v) : next.add(v);
    onChange(next);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 font-medium whitespace-nowrap group ${active ? "text-blue-700" : "text-gray-600"}`}
      >
        {label}
        <span className={`text-[10px] ${active ? "text-blue-500" : "text-gray-400"}`}>▼</span>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl min-w-[160px] max-h-64 overflow-y-auto">
          <label className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-gray-50 sticky top-0 bg-white">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => { if (el) el.indeterminate = someSelected; }}
              onChange={toggleAll}
              className="accent-blue-600"
            />
            <span className="text-sm font-semibold text-gray-700">(Select All)</span>
          </label>
          {values.map((v) => (
            <label key={v} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-blue-50">
              <input type="checkbox" checked={selected.has(v)} onChange={() => toggle(v)} className="accent-blue-600" />
              <span className="text-sm text-gray-700 truncate">{v || "—"}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StockPage() {
  const { status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("All Lots");
  const [lots, setLots] = useState<StockLot[]>([]);
  const [suspense, setSuspense] = useState<SuspenseTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [colFilters, setColFilters] = useState<Record<ColKey, Set<string>>>({ grade: new Set(), size: new Set(), supplyCondition: new Set(), make: new Set(), location: new Set(), description: new Set() });
  const [initialized, setInitialized] = useState(false);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch("/api/stock")
      .then((r) => r.json())
      .then((d) => {
        const fetchedLots = d.lots || [];
        setLots(fetchedLots);
        setSuspense(d.suspense || []);
        setLoading(false);
        if (!initialized) {
          const init: Record<ColKey, Set<string>> = {} as Record<ColKey, Set<string>>;
          COL_KEYS.forEach((k) => { init[k] = new Set(distinct(fetchedLots, k)); });
          setColFilters(init);
          setInitialized(true);
        }
      });
  }, [status]);

  if (status === "loading") return null;

  function setFilter(k: ColKey, s: Set<string>) {
    setColFilters((f) => ({ ...f, [k]: s }));
  }

  function filteredLots(source: StockLot[]) {
    return source.filter((l) =>
      COL_KEYS.every((k) => {
        const val = l[k] ?? "";
        return colFilters[k].size === 0 || colFilters[k].has(val);
      })
    );
  }

  const allDistinct = (key: ColKey) => distinct(lots, key);
  const byForm = (form: string) => filteredLots(lots.filter((l) => l.originForm === form));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Stock Database</h1>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "All Lots" && (
          <LotTable lots={filteredLots(lots)} loading={loading} colFilters={colFilters} allDistinct={allDistinct} setFilter={setFilter} />
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
                <LotTable lots={byForm(key)} loading={loading} colFilters={colFilters} allDistinct={allDistinct} setFilter={setFilter} />
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

function LotTable({ lots, loading, colFilters, allDistinct, setFilter }: {
  lots: StockLot[];
  loading: boolean;
  colFilters: Record<ColKey, Set<string>>;
  allDistinct: (k: ColKey) => string[];
  setFilter: (k: ColKey, s: Set<string>) => void;
}) {
  if (loading) return <p className="text-center text-gray-400 py-10 text-sm">Loading...</p>;
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Date</th>
            {COL_KEYS.map((k) => (
              <th key={k} className="px-3 py-3 whitespace-nowrap">
                <ColumnFilter
                  label={COL_LABELS[k]}
                  values={allDistinct(k)}
                  selected={colFilters[k]}
                  onChange={(s) => setFilter(k, s)}
                />
              </th>
            ))}
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Pieces</th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Qty</th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Length</th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">UID No.</th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {lots.length === 0 && (
            <tr><td colSpan={12} className="text-center text-gray-400 py-10">No lots match the current filters.</td></tr>
          )}
          {lots.map((lot) => (
            <tr key={lot.id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 whitespace-nowrap">{new Date(lot.dateCreated).toLocaleDateString("en-IN")}</td>
              <td className="px-3 py-2 font-medium">{lot.grade}</td>
              <td className="px-3 py-2">{lot.size}</td>
              <td className="px-3 py-2">{lot.supplyCondition}</td>
              <td className="px-3 py-2">{lot.make}</td>
              <td className="px-3 py-2">{lot.location}</td>
              <td className="px-3 py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lot.description === "Prime" || lot.description === "PRIME" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {lot.description}
                </span>
              </td>
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
