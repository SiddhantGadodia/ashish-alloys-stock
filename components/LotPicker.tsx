"use client";
import { useState, useEffect } from "react";

export interface FullLot {
  id: string;
  grade: string;
  size: string;
  supplyCondition: string;
  make: string;
  location: string;
  quantity: number;
  description: string;
  dateCreated: string;
  pieces: number | null;
  uidNo: string | null;
  subLoc: string | null;
  jwNo: string | null;
  length: number | null;
  remarks: string | null;
}

interface Props {
  location: string;
  selected: FullLot[];
  onChange: (lots: FullLot[]) => void;
}

export default function LotPicker({ location, selected, onChange }: Props) {
  const [lots, setLots] = useState<FullLot[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!location) return;
    fetch(`/api/stock?location=${encodeURIComponent(location)}`)
      .then((r) => r.json())
      .then((d) => setLots(d.lots || []));
  }, [location]);

  const filtered = lots.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return l.grade.toLowerCase().includes(q) || l.size.toLowerCase().includes(q) || l.make.toLowerCase().includes(q) || (l.uidNo ?? "").toLowerCase().includes(q);
  });

  function toggle(lot: FullLot) {
    const already = selected.find((s) => s.id === lot.id);
    onChange(already ? selected.filter((s) => s.id !== lot.id) : [...selected, lot]);
  }

  const isSelected = (id: string) => selected.some((s) => s.id === id);

  return (
    <div className="space-y-2">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search grade / size / make / UID…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-64">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 text-left sticky top-0">
            <tr>
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2 font-medium text-gray-600">Grade</th>
              <th className="px-3 py-2 font-medium text-gray-600">Size</th>
              <th className="px-3 py-2 font-medium text-gray-600">Supply Cond.</th>
              <th className="px-3 py-2 font-medium text-gray-600">Make</th>
              <th className="px-3 py-2 font-medium text-gray-600">Description</th>
              <th className="px-3 py-2 font-medium text-gray-600">UID No.</th>
              <th className="px-3 py-2 font-medium text-gray-600">Sub Loc</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">Avail. Qty</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">Pcs</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="text-center text-gray-400 py-6">No lots at this location.</td></tr>
            )}
            {filtered.map((lot) => (
              <tr
                key={lot.id}
                onClick={() => toggle(lot)}
                className={`border-t border-gray-100 cursor-pointer transition ${isSelected(lot.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}
              >
                <td className="px-3 py-2"><input type="checkbox" readOnly checked={isSelected(lot.id)} className="accent-blue-600" /></td>
                <td className="px-3 py-2 font-medium">{lot.grade}</td>
                <td className="px-3 py-2">{lot.size}</td>
                <td className="px-3 py-2">{lot.supplyCondition}</td>
                <td className="px-3 py-2">{lot.make}</td>
                <td className="px-3 py-2">{lot.description}</td>
                <td className="px-3 py-2 text-gray-500">{lot.uidNo ?? "—"}</td>
                <td className="px-3 py-2 text-gray-500">{lot.subLoc ?? "—"}</td>
                <td className="px-3 py-2 text-right font-semibold">{lot.quantity.toFixed(3)}</td>
                <td className="px-3 py-2 text-right">{lot.pieces ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-blue-600 font-medium">{selected.length} lot{selected.length > 1 ? "s" : ""} selected</p>
      )}
    </div>
  );
}
