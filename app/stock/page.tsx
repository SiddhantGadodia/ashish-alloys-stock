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
  jwNo: string | null;
  remarks: string | null;
  lineage: string | null;
  dateCreated: string;
  originForm: string;
}

interface SuspenseTotal {
  id: string;
  location: string;
  total: number;
}

const TABS = ["All Lots", "By Form", "Suspense", "Job Works", "Sales", "Production Chart"] as const;
type Tab = typeof TABS[number];

interface JwLot {
  id: string; grade: string; size: string; supplyCondition: string; make: string;
  location: string; pieces: number | null; quantity: number; length: number | null;
  description: string; uidNo: string | null; subLoc: string | null; jwNo: string | null;
  remarks: string | null; dateCreated: string;
}
interface JwEntry { jwNo: string; rows: { type: string; lot: JwLot }[] }

interface SaleRow {
  saleId: string;
  date: string;
  customer: string;
  qty: number;
  vehicleNo: string;
  grade: string;
  size: string;
  supplyCondition: string;
  make: string;
  location: string;
  subLoc: string;
  uidNo: string;
  pieces: string;
  status: string;
}

interface ProdChartRow {
  id: string;
  machine: string;
  sizeOg: string;
  sizeFinal: string;
  grade: string;
  qty: number;
  supplyConditionOg: string;
  supplyConditionFinal: string;
  make: string;
  description: string;
  location: string;
  subLoc: string;
  length: number;
  remarks: string;
}

const COL_KEYS = ["grade", "size", "supplyCondition", "make", "location", "description", "subLoc"] as const;
type ColKey = typeof COL_KEYS[number];
const COL_LABELS: Record<ColKey, string> = { grade: "Grade", size: "Size", supplyCondition: "Supply Cond.", make: "Make", location: "Location", description: "Description", subLoc: "Sub Loc" };

function distinct(lots: StockLot[], key: ColKey): string[] {
  // For subLoc include blank as an option
  if (key === "subLoc") {
    const vals = Array.from(new Set(lots.map((l) => (l as StockLot & { subLoc?: string | null }).subLoc ?? ""))).sort();
    return vals;
  }
  return Array.from(new Set(lots.map((l) => (l as Record<string, string>)[key] ?? "").filter(Boolean))).sort();
}

// Returns lots filtered by all columns EXCEPT the given key (for cascading dropdown values)
function filteredExcept(lots: StockLot[], colFilters: Record<ColKey, Set<string>>, except: ColKey): StockLot[] {
  return lots.filter((l) =>
    COL_KEYS.every((k) => {
      if (k === except) return true;
      if (colFilters[k].size === 0) return true;
      const val = k === "subLoc"
        ? ((l as StockLot & { subLoc?: string | null }).subLoc ?? "")
        : ((l as Record<string, string>)[k] ?? "");
      return colFilters[k].has(val);
    })
  );
}

function applyFilters(lots: StockLot[], colFilters: Record<ColKey, Set<string>>): StockLot[] {
  return lots.filter((l) =>
    COL_KEYS.every((k) => {
      if (colFilters[k].size === 0) return true;
      const val = k === "subLoc"
        ? ((l as StockLot & { subLoc?: string | null }).subLoc ?? "")
        : ((l as Record<string, string>)[k] ?? "");
      return colFilters[k].has(val);
    })
  );
}

function DateFilter({ from, to, onChange }: {
  from: string; to: string; onChange: (from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = !!from || !!to;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 font-medium whitespace-nowrap ${active ? "text-blue-700" : "text-gray-600"}`}
      >
        Date
        <span className={`text-[10px] ${active ? "text-blue-500" : "text-gray-400"}`}>▼</span>
        {active && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block ml-0.5" />}
      </button>
      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl w-56 p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Date Range</p>
          <div>
            <label className="text-xs text-gray-500 mb-0.5 block">From</label>
            <input type="date" value={from} onChange={(e) => onChange(e.target.value, to)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-0.5 block">To</label>
            <input type="date" value={to} onChange={(e) => onChange(from, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {active && (
            <button onClick={() => onChange("", "")} className="text-xs text-red-500 hover:underline w-full text-left pt-1">
              Clear
            </button>
          )}
        </div>
      )}
    </div>
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
        <div className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl w-56 max-h-64 overflow-y-auto">
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

type FlatJwRow = { key: string; jwNo: string; jwSpan: number | undefined; lotNo: number; lotSpan: number | undefined; type: string; lot: JwLot };

function buildFlatJwRows(entries: JwEntry[]): FlatJwRow[] {
  const flat: FlatJwRow[] = [];
  for (const entry of entries) {
    const sgs: { lotNo: number; rows: JwEntry["rows"] }[] = [];
    for (const row of entry.rows) {
      if (row.type === "transferred") sgs.push({ lotNo: sgs.length + 1, rows: [row] });
      else if (sgs.length > 0) sgs[sgs.length - 1].rows.push(row);
    }
    let firstOfEntry = true;
    for (const sg of sgs) {
      let firstOfSg = true;
      for (const row of sg.rows) {
        flat.push({
          key: `${entry.jwNo}-${flat.length}`,
          jwNo: entry.jwNo,
          jwSpan: firstOfEntry ? entry.rows.length : undefined,
          lotNo: sg.lotNo,
          lotSpan: firstOfSg ? sg.rows.length : undefined,
          type: row.type,
          lot: row.lot,
        });
        firstOfEntry = false;
        firstOfSg = false;
      }
    }
  }
  return flat;
}

function JwTableBody({ entries }: { entries: JwEntry[] }) {
  const rows = buildFlatJwRows(entries);
  return (
    <tbody>
      {rows.map((r) => {
        const l = r.lot;
        const isT = r.type === "transferred";
        return (
          <tr key={r.key} className={`border-t border-gray-100 ${isT ? "bg-indigo-50/60" : "bg-emerald-50/60"}`}>
            {r.jwSpan !== undefined && (
              <td rowSpan={r.jwSpan} className="px-3 py-2 font-bold text-indigo-700 align-middle border-r border-indigo-100 whitespace-nowrap">{r.jwNo}</td>
            )}
            {r.lotSpan !== undefined && (
              <td rowSpan={r.lotSpan} className="px-3 py-2 align-middle border-r border-gray-100 whitespace-nowrap">
                <span className="text-xs font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">Lot {r.lotNo}</span>
              </td>
            )}
            <td className="px-3 py-2 whitespace-nowrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isT ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>
                {isT ? "Transferred" : "Finished"}
              </span>
            </td>
            <td className="px-3 py-2 whitespace-nowrap">{new Date(l.dateCreated).toLocaleDateString("en-IN")}</td>
            <td className="px-3 py-2 font-medium whitespace-nowrap">{l.grade}</td>
            <td className="px-3 py-2 whitespace-nowrap">{l.size}</td>
            <td className="px-3 py-2 whitespace-nowrap">{l.supplyCondition}</td>
            <td className="px-3 py-2 text-right font-semibold">{l.quantity.toFixed(3)}</td>
            <td className="px-3 py-2 whitespace-nowrap">{l.location}</td>
            <td className="px-3 py-2 whitespace-nowrap">{l.make}</td>
            <td className="px-3 py-2 whitespace-nowrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.description === "Prime" || l.description === "PRIME" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                {l.description}
              </span>
            </td>
            <td className="px-3 py-2 whitespace-nowrap">{l.uidNo ?? "—"}</td>
            <td className="px-3 py-2 text-right">{l.pieces ?? "—"}</td>
            <td className="px-3 py-2 whitespace-nowrap">{l.subLoc ?? "—"}</td>
            <td className="px-3 py-2 text-right">{l.length ?? "—"}</td>
            <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">{l.remarks ?? "—"}</td>
          </tr>
        );
      })}
    </tbody>
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
    grade: new Set(), size: new Set(), supplyCondition: new Set(), make: new Set(), location: new Set(), description: new Set(), subLoc: new Set(),
  });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "size" | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [jwEntries, setJwEntries] = useState<JwEntry[]>([]);
  const [jwLoading, setJwLoading] = useState(false);
  const [saleRows, setSaleRows] = useState<SaleRow[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [prodRows, setProdRows] = useState<ProdChartRow[]>([]);
  const [prodLoading, setProdLoading] = useState(false);

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

  useEffect(() => {
    if (tab === "Job Works" && status === "authenticated") {
      setJwLoading(true);
      fetch("/api/jobworks").then((r) => r.json()).then((d) => { setJwEntries(d.entries || []); setJwLoading(false); });
    }
    if (tab === "Production Chart" && status === "authenticated") {
      setProdLoading(true);
      fetch("/api/forms/production").then((r) => r.json()).then((raw) => {
        type ActSec = { date: string; machine: string; sizeFinal: string; supplyConditionFinal: string; qty: number; lengthFinal: number; remarks: string };
        type ActLotEntry = { lotId: string; lotSnapshot: { grade: string; size: string; supplyCondition: string; make: string; description: string; location: string; subLoc?: string; quantity: number }; sections: ActSec[] };
        const entries = raw as { id: string; status: string; actLotsJson: string | null }[];
        const rows: ProdChartRow[] = [];
        for (const e of entries) {
          if (e.status !== "verified" || !e.actLotsJson) continue;
          const lots = JSON.parse(e.actLotsJson) as ActLotEntry[];
          for (const l of lots) {
            for (const sec of l.sections) {
              rows.push({
                id: `${e.id}-${rows.length}`,
                machine: sec.machine || "—",
                sizeOg: l.lotSnapshot.size,
                sizeFinal: sec.sizeFinal || "—",
                grade: l.lotSnapshot.grade,
                qty: sec.qty,
                supplyConditionOg: l.lotSnapshot.supplyCondition,
                supplyConditionFinal: sec.supplyConditionFinal || "—",
                make: l.lotSnapshot.make,
                description: l.lotSnapshot.description,
                location: l.lotSnapshot.location,
                subLoc: l.lotSnapshot.subLoc || "—",
                length: sec.lengthFinal,
                remarks: sec.remarks || "—",
              });
            }
          }
        }
        setProdRows(rows);
        setProdLoading(false);
      });
    }
    if (tab === "Sales" && status === "authenticated") {
      setSalesLoading(true);
      fetch("/api/forms/sales").then((r) => r.json()).then((raw) => {
        const entries = raw as { id: string; status: string; locationFrom: string | null; actLotsJson: string | null; instrLotsJson: string | null; createdAt: string }[];
        const rows: SaleRow[] = [];
        for (const e of entries) {
          if (e.status !== "verified") continue;
          const json = e.actLotsJson || e.instrLotsJson;
          if (!json) continue;
          type LotEntry = { lotSnapshot: { grade: string; size: string; supplyCondition: string; make: string; subLoc?: string; uidNo?: string; pieces?: number }; detail: { customer: string; qty: number; vehicleNo?: string; pieces?: number } };
          const lots = JSON.parse(json) as LotEntry[];
          for (const l of lots) {
            rows.push({
              saleId: e.id,
              date: e.createdAt,
              customer: l.detail.customer || "—",
              qty: l.detail.qty,
              vehicleNo: l.detail.vehicleNo || "—",
              grade: l.lotSnapshot.grade,
              size: l.lotSnapshot.size,
              supplyCondition: l.lotSnapshot.supplyCondition,
              make: l.lotSnapshot.make,
              location: e.locationFrom || "—",
              subLoc: l.lotSnapshot.subLoc || "—",
              uidNo: l.lotSnapshot.uidNo || "—",
              pieces: l.detail.pieces != null ? String(l.detail.pieces) : (l.lotSnapshot.pieces != null ? String(l.lotSnapshot.pieces) : "—"),
              status: e.status,
            });
          }
        }
        setSaleRows(rows);
        setSalesLoading(false);
      });
    }
  }, [tab, status]);

  if (status === "loading") return null;

  function setFilter(k: ColKey, s: Set<string>) {
    setColFilters((f) => ({ ...f, [k]: s }));
  }

  // Cascading: values shown in a column's dropdown = distinct values in lots filtered by all OTHER columns
  function cascadeValues(key: ColKey): string[] {
    return distinct(filteredExcept(lots, colFilters, key), key);
  }

  function applyDateFilter(l: StockLot) {
    const d = new Date(l.dateCreated);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
    return true;
  }

  function applySort(arr: StockLot[]): StockLot[] {
    if (!sortBy) return arr;
    return [...arr].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") cmp = new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
      if (sortBy === "size") cmp = parseFloat(a.size) - parseFloat(b.size) || a.size.localeCompare(b.size);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  function toggleSort(key: "date" | "size") {
    if (sortBy === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("asc"); }
  }

  const filtered = applySort(applyFilters(lots, colFilters).filter(applyDateFilter));
  const byForm = (form: string) => applySort(applyFilters(lots.filter((l) => l.originForm === form), colFilters).filter(applyDateFilter));

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
          <LotTable lots={filtered} loading={loading} colFilters={colFilters} cascadeValues={cascadeValues} setFilter={setFilter} dateFrom={dateFrom} dateTo={dateTo} onDateChange={(f, t) => { setDateFrom(f); setDateTo(t); }} sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
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
                      <LotTable lots={sectionLots} loading={loading} colFilters={colFilters} cascadeValues={cascadeValues} setFilter={setFilter} dateFrom={dateFrom} dateTo={dateTo} onDateChange={(f, t) => { setDateFrom(f); setDateTo(t); }} sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "Job Works" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-indigo-50">
              <h2 className="text-base font-semibold text-indigo-800">Job Works</h2>
              <p className="text-xs text-indigo-500 mt-0.5">Lots created via JW in Internal Transfer, and their Finished Goods outputs</p>
            </div>
            {jwLoading ? (
              <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>
            ) : jwEntries.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">No job work entries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1200px]">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">JW No.</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Lot</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Type</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Date</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Grade</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Size</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Supply Cond.</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Qty</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Location</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Make</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Description</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">UID No.</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Pieces</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Sub Loc</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Length</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Remarks</th>
                    </tr>
                  </thead>
                  <JwTableBody entries={jwEntries} />
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Sales" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-red-50">
              <h2 className="text-base font-semibold text-red-800">Sales</h2>
              <p className="text-xs text-red-500 mt-0.5">All sale entries — instruction and actuals</p>
            </div>
            {salesLoading ? (
              <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>
            ) : saleRows.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">No sale entries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1100px]">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Status</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Customer</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Qty</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Pieces</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Vehicle No.</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Grade</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Size</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Supply Cond.</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Make</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Location</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Sub Loc</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">UID No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleRows.map((r, i) => {
                      const statusColor = r.status === "verified" ? "bg-green-100 text-green-700" : r.status === "actuals_filled" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600";
                      const statusLabel = r.status === "verified" ? "Verified" : r.status === "actuals_filled" ? "Actuals Filled" : "Instruction";
                      return (
                        <tr key={`${r.saleId}-${i}`} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>{statusLabel}</span>
                          </td>
                          <td className="px-3 py-2 font-semibold whitespace-nowrap">{r.customer}</td>
                          <td className="px-3 py-2 text-right font-semibold">{r.qty.toFixed(3)}</td>
                          <td className="px-3 py-2 text-right">{r.pieces}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.vehicleNo}</td>
                          <td className="px-3 py-2 font-medium whitespace-nowrap">{r.grade}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.size}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.supplyCondition}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.make}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.location}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.subLoc}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.uidNo}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Production Chart" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-purple-50">
              <h2 className="text-base font-semibold text-purple-800">Production Chart</h2>
              <p className="text-xs text-purple-500 mt-0.5">Verified production actuals — one row per section</p>
            </div>
            {prodLoading ? (
              <p className="text-center text-gray-400 py-10 text-sm">Loading…</p>
            ) : prodRows.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">No verified production actuals yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[1400px]">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Machine</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">OG Size</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Final Size</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Grade</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Qty</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">SC Initial</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">SC Final</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Make</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Description</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Location</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Sub Loc</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Length</th>
                      <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prodRows.map((r) => (
                      <tr key={r.id} className="border-t border-gray-100 hover:bg-purple-50/40">
                        <td className="px-3 py-2 font-semibold text-purple-700 whitespace-nowrap">{r.machine}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.sizeOg}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{r.sizeFinal}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.grade}</td>
                        <td className="px-3 py-2 text-right font-semibold">{r.qty.toFixed(3)}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-500">{r.supplyConditionOg}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.supplyConditionFinal}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.make}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.description === "Prime" || r.description === "PRIME" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{r.description}</span>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.location}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.subLoc}</td>
                        <td className="px-3 py-2 text-right">{r.length || "—"}</td>
                        <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">{r.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
  subLoc:          { th: "bg-teal-100",   td: "bg-teal-50" },
};

function LotTable({ lots, loading, colFilters, cascadeValues, setFilter, dateFrom, dateTo, onDateChange, sortBy, sortDir, onSort }: {
  lots: StockLot[]; loading: boolean;
  colFilters: Record<ColKey, Set<string>>;
  cascadeValues: (k: ColKey) => string[];
  setFilter: (k: ColKey, s: Set<string>) => void;
  dateFrom: string; dateTo: string;
  onDateChange: (f: string, t: string) => void;
  sortBy: "date" | "size" | null;
  sortDir: "asc" | "desc";
  onSort: (k: "date" | "size") => void;
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
            <th className={`px-3 py-3 whitespace-nowrap ${(dateFrom || dateTo) ? "bg-sky-100" : ""}`}>
              <div className="flex items-center gap-1">
                <DateFilter from={dateFrom} to={dateTo} onChange={onDateChange} />
                <button onClick={() => onSort("date")} className={`text-[10px] ml-1 ${sortBy==="date"?"text-blue-600":"text-gray-300 hover:text-gray-500"}`}>{sortBy==="date"?(sortDir==="asc"?"▲":"▼"):"⇅"}</button>
              </div>
            </th>
            <th className={thCls("grade")}><ColumnFilter label={COL_LABELS["grade"]} values={cascadeValues("grade")} selected={colFilters["grade"]} onChange={(s) => setFilter("grade", s)} /></th>
            <th className={thCls("size")}>
              <div className="flex items-center gap-1">
                <ColumnFilter label={COL_LABELS["size"]} values={cascadeValues("size")} selected={colFilters["size"]} onChange={(s) => setFilter("size", s)} />
                <button onClick={() => onSort("size")} className={`text-[10px] ml-1 ${sortBy==="size"?"text-blue-600":"text-gray-300 hover:text-gray-500"}`}>{sortBy==="size"?(sortDir==="asc"?"▲":"▼"):"⇅"}</button>
              </div>
            </th>
            <th className={thCls("supplyCondition")}><ColumnFilter label={COL_LABELS["supplyCondition"]} values={cascadeValues("supplyCondition")} selected={colFilters["supplyCondition"]} onChange={(s) => setFilter("supplyCondition", s)} /></th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Qty</th>
            <th className={thCls("location")}><ColumnFilter label={COL_LABELS["location"]} values={cascadeValues("location")} selected={colFilters["location"]} onChange={(s) => setFilter("location", s)} /></th>
            <th className={thCls("make")}><ColumnFilter label={COL_LABELS["make"]} values={cascadeValues("make")} selected={colFilters["make"]} onChange={(s) => setFilter("make", s)} /></th>
            <th className={thCls("description")}><ColumnFilter label={COL_LABELS["description"]} values={cascadeValues("description")} selected={colFilters["description"]} onChange={(s) => setFilter("description", s)} /></th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">UID No.</th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Pieces</th>
            <th className={thCls("subLoc")}><ColumnFilter label={COL_LABELS["subLoc"]} values={cascadeValues("subLoc")} selected={colFilters["subLoc"]} onChange={(s) => setFilter("subLoc", s)} /></th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap text-right">Length</th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">Remarks</th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">JW No.</th>
            <th className="px-3 py-3 font-medium text-gray-600 whitespace-nowrap">History</th>
          </tr>
        </thead>
        <tbody>
          {lots.length === 0 && (
            <tr><td colSpan={16} className="text-center text-gray-400 py-10">No lots match the current filters.</td></tr>
          )}
          {lots.map((lot) => (
            <tr key={lot.id} className="border-t border-gray-100 hover:brightness-95">
              <td className={`px-3 py-2 whitespace-nowrap ${(dateFrom || dateTo) ? "bg-sky-50" : ""}`}>{new Date(lot.dateCreated).toLocaleDateString("en-IN")}</td>
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
              <td className={tdCls("subLoc")}>{(lot as { subLoc?: string | null }).subLoc ?? "—"}</td>
              <td className="px-3 py-2 text-right">{lot.length ?? "—"}</td>
              <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">{lot.remarks ?? "—"}</td>
              <td className="px-3 py-2 font-medium text-indigo-700">{lot.jwNo ?? "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {lot.lineage ? lot.lineage.split(", ").map((tag) => (
                  <span key={tag} className="inline-block mr-1 mb-0.5 text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">{tag}</span>
                )) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
