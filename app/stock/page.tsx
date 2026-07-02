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

// Returns lots filtered by all columns EXCEPT the given key (for cascading dropdown values)
function filteredExcept(lots: StockLot[], colFilters: Record<ColKey, Set<string>>, except: ColKey): StockLot[] {
  return lots.filter((l) =>
    COL_KEYS.every((k) => {
      if (k === except) return true;
      return colFilters[k].size === 0 || colFilters[k].has(l[k] ?? "");
    })
  );
}

function applyFilters(lots: StockLot[], colFilters: Record<ColKey, Set<string>>): StockLot[] {
  return lots.filter((l) =>
    COL_KEYS.every((k) => colFilters[k].size === 0 || colFilters[k].has(l[k] ?? ""))
  );
}

function ColumnFilter({ label, values, selected, onChange }: {
  label: string; values: string[]; selected: Set<string>; onChange: (s: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allSelected = values.length > 0 && values.every((v) => selected.has(v));
  const someSelected = !allSelected && values.some((v) => selected.has(v));
  const active = selected.size > 0 && !allSelected;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function toggleAll() { onChange(allSelected ? new Set() : new Set(values)); }
  function toggle(v: string) {
    const next = new Set(selected);
    next.has(v) ? next.delete(v) : next.add(v);
    onChange(next);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 font-medium whitespace-nowrap ${active ? "text-blue-700" : "text-gray-600"}`}
      >
        {label}
        <span className={`text-[10px] ${active ? "text-blue-500" : "text-gray-400"}`}>▼</span>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block ml-0.5" />}
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
          {values.length === 0 && <p className="text-xs text-gray-400 px-3 py-2">No values</p>}
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
  const [colFilters, setColFilters] = useState<Record<ColKey, Set<string>>>({
    grade: new Set(), size: new Set(), supplyCondition: new Set(), make: new Set(), location: new Set(), description: new Set(),
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch("/api/stock")
      .then((r) => r.json())
      .then((d) => {
        const fetchedLots: StockLot[] = d.lots || [];
        setLots(fetchedLots);
        setSuspense(d.suspense || []);
        setLoading(false);
        // Init filters: all values selected
        const init: Record<ColKey, Set<string>> = {} as Record<ColKey, Set<string>>;
        COL_KEYS.forEach((k) => { init[k] = new Set(distinct(fetchedLots, k)); });
        setColFilters(init);
      });
  }, [status]);

  if (status === "loading") return null;

  function setFilter(k: ColKey, s: Set<string>) {
    setColFilters((f) => ({ ...f, [k]: s }));
  }

  // Cascading: values shown in a column's dropdown = distinct values in lots filtered by all OTHER columns
  function cascadeValues(key: ColKey): string[] {
    return distinct(filteredExcept(lots, colFilters, key), key);
  }

  const filtered = applyFilters(lots, colFilters);
  const byForm = (form: string) => applyFilters(lots.filter((l) => l.originForm === form), colFilters);

  const BY_FORM_SECTIONS = [
    { key: "purchase", label: "Purchase Entries" },
    { key: "internal_transfer", label: "Internal Transfers" },
    { key: "finished_goods", label: "Finished Goods" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Stock Database</h1>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${tab === t ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "All Lots" && (
          <LotTable lots={filtered} loading={loading} colFilters={colFilters} cascadeValues={cascadeValues} setFilter={setFilter} />
        )}

        {tab === "By Form" && (
          <div className="space-y-4">
            {BY_FORM_SECTIONS.map(({ key, label }) => {
              const sectionLots = byForm(key);
              const open = !!openSections[key];
              return (
                <div key={key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setOpenSections((s) => ({ ...s, [key]: !open }))}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition text-left"
                  >
                    <span className="text-base font-semibold text-gray-700">{label}</span>
                    <span className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{sectionLots.length} lot{sectionLots.length !== 1 ? "s" : ""}</span>
                      <span className="text-lg">{open ? "▲" : "▼"}</span>
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-gray-100">
                      <LotTable lots={sectionLots} loading={loading} colFilters={colFilters} cascadeValues={cascadeValues} setFilter={setFilter} />
                    </div>
                  )}
                </div>
              );
            })}
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

// One distinct colour per filterable column
const COL_COLORS: Record<ColKey, { th: string; td: string }> = {
  grade:           { th: "bg-blue-100",   td: "bg-blue-50" },
  size:            { th: "bg-purple-100", td: "bg-purple-50" },
  supplyCondition: { th: "bg-emerald-100",td: "bg-emerald-50" },
  location:        { th: "bg-rose-100",   td: "bg-rose-50" },
  make:            { th: "bg-orange-100", td: "bg-orange-50" },
  description:     { th: "bg-amber-100",  td: "bg-amber-50" },
};

function LotTable({ lots, loading, colFilters, cascadeValues, setFilter }: {
  lots: StockLot[]; loading: boolean;
  colFilters: Record<ColKey, Set<string>>;
  cascadeValues: (k: ColKey) => string[];
  setFilter: (k: ColKey, s: Set<string>) => void;
}) {
  if (loading) return <p className="text-center text-gray-400 py-10 text-sm">Loading...</p>;

  // A column is "active" when its filter excludes at least one value
  function isActive(k: ColKey) {
    const vals = cascadeValues(k);
    return vals.length > 0 && !vals.every((v) => colFilters[k].has(v));
  }

  function thCls(k: ColKey) {
    return `px-3 py-3 whitespace-nowrap transition-colors ${isActive(k) ? COL_COLORS[k].th : ""}`;
  }
  function tdCls(k: ColKey, extra = "") {
    return `px-3 py-2 transition-colors ${isActive(k) ? COL_COLORS[k].td : ""} ${extra}`.trim();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm min-w-[1000px]">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Date</th>
            <th className={thCls("grade")}><ColumnFilter label={COL_LABELS["grade"]} values={cascadeValues("grade")} selected={colFilters["grade"]} onChange={(s) => setFilter("grade", s)} /></th>
            <th className={thCls("size")}><ColumnFilter label={COL_LABELS["size"]} values={cascadeValues("size")} selected={colFilters["size"]} onChange={(s) => setFilter("size", s)} /></th>
            <th className={thCls("supplyCondition")}><ColumnFilter label={COL_LABELS["supplyCondition"]} values={cascadeValues("supplyCondition")} selected={colFilters["supplyCondition"]} onChange={(s) => setFilter("supplyCondition", s)} /></th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Qty</th>
            <th className={thCls("location")}><ColumnFilter label={COL_LABELS["location"]} values={cascadeValues("location")} selected={colFilters["location"]} onChange={(s) => setFilter("location", s)} /></th>
            <th className={thCls("make")}><ColumnFilter label={COL_LABELS["make"]} values={cascadeValues("make")} selected={colFilters["make"]} onChange={(s) => setFilter("make", s)} /></th>
            <th className={thCls("description")}><ColumnFilter label={COL_LABELS["description"]} values={cascadeValues("description")} selected={colFilters["description"]} onChange={(s) => setFilter("description", s)} /></th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">UID No.</th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Pieces</th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Sub Loc</th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Length</th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {lots.length === 0 && (
            <tr><td colSpan={14} className="text-center text-gray-400 py-10">No lots match the current filters.</td></tr>
          )}
          {lots.map((lot) => (
            <tr key={lot.id} className="border-t border-gray-100 hover:brightness-95">
              <td className="px-3 py-2 whitespace-nowrap">{new Date(lot.dateCreated).toLocaleDateString("en-IN")}</td>
              <td className={tdCls("grade", "font-medium")}>{lot.grade}</td>
              <td className={tdCls("size")}>{lot.size}</td>
              <td className={tdCls("supplyCondition")}>{lot.supplyCondition}</td>
              <td className="px-3 py-2 text-right font-semibold">{lot.quantity.toFixed(3)}</td>
              <td className={tdCls("location")}>{lot.location}</td>
              <td className={tdCls("make")}>{lot.make}</td>
              <td className={tdCls("description")}>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lot.description === "Prime" || lot.description === "PRIME" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {lot.description}
                </span>
              </td>
              <td className="px-3 py-2">{lot.uidNo ?? "—"}</td>
              <td className="px-3 py-2 text-right">{lot.pieces ?? "—"}</td>
              <td className="px-3 py-2">{(lot as { subLoc?: string | null }).subLoc ?? "—"}</td>
              <td className="px-3 py-2 text-right">{lot.length ?? "—"}</td>
              <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">{lot.remarks ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
