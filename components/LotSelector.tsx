"use client";
import { useState, useEffect } from "react";

interface StockLot {
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
}

interface LotSelection {
  lotId: string;
  assignedQty: number;
  grade: string;
  size: string;
  supplyCondition: string;
  make: string;
  description: string;
  quantity: number;
}

interface Props {
  filterByLocation?: string;
  onSelectionChange: (selections: LotSelection[]) => void;
}

export default function LotSelector({ filterByLocation, onSelectionChange }: Props) {
  const [lots, setLots] = useState<StockLot[]>([]);
  const [filters, setFilters] = useState({ grade: "", size: "", supplyCondition: "", make: "", location: filterByLocation || "", description: "" });
  const [selected, setSelected] = useState<{ lot: StockLot; assignedQty: string }[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    fetch(`/api/stock?${params}`)
      .then((r) => r.json())
      .then((d) => setLots(d.lots || []));
  }, [filters]);

  useEffect(() => {
    onSelectionChange(
      selected
        .filter((s) => s.assignedQty && parseFloat(s.assignedQty) > 0)
        .map((s) => ({
          lotId: s.lot.id,
          assignedQty: parseFloat(s.assignedQty),
          grade: s.lot.grade,
          size: s.lot.size,
          supplyCondition: s.lot.supplyCondition,
          make: s.lot.make,
          description: s.lot.description,
          quantity: s.lot.quantity,
        }))
    );
  }, [selected, onSelectionChange]);

  function toggleLot(lot: StockLot) {
    setSelected((prev) => {
      const exists = prev.find((s) => s.lot.id === lot.id);
      if (exists) return prev.filter((s) => s.lot.id !== lot.id);
      return [...prev, { lot, assignedQty: filterByLocation ? String(lot.quantity) : "" }];
    });
  }

  function setAssigned(lotId: string, qty: string) {
    setSelected((prev) => prev.map((s) => s.lot.id === lotId ? { ...s, assignedQty: qty } : s));
  }

  const isSelected = (id: string) => selected.some((s) => s.lot.id === id);

  return (
    <div className="space-y-4">
      {!filterByLocation && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(["grade", "size", "supplyCondition", "make", "location", "description"] as const).map((k) => (
            <input
              key={k}
              value={filters[k]}
              onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.value }))}
              placeholder={k === "supplyCondition" ? "Supply Cond." : k.charAt(0).toUpperCase() + k.slice(1)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ))}
        </div>
      )}

      <div className="border border-gray-200 rounded-xl overflow-x-auto max-h-72">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-gray-50 text-left sticky top-0">
            <tr>
              <th className="px-3 py-2"></th>
              <th className="px-3 py-2 font-medium text-gray-600">Grade</th>
              <th className="px-3 py-2 font-medium text-gray-600">Size</th>
              <th className="px-3 py-2 font-medium text-gray-600">Location</th>
              <th className="px-3 py-2 font-medium text-gray-600">Make</th>
              <th className="px-3 py-2 font-medium text-gray-600">Avail. Qty</th>
              <th className="px-3 py-2 font-medium text-gray-600">UID</th>
            </tr>
          </thead>
          <tbody>
            {lots.length === 0 && (
              <tr><td colSpan={7} className="text-center text-gray-400 py-6 text-sm">No lots found.</td></tr>
            )}
            {lots.map((lot) => (
              <tr
                key={lot.id}
                onClick={() => toggleLot(lot)}
                className={`border-t border-gray-100 cursor-pointer transition ${isSelected(lot.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}
              >
                <td className="px-3 py-2">
                  <input type="checkbox" readOnly checked={isSelected(lot.id)} className="accent-blue-600" />
                </td>
                <td className="px-3 py-2 font-medium">{lot.grade}</td>
                <td className="px-3 py-2">{lot.size}</td>
                <td className="px-3 py-2">{lot.location}</td>
                <td className="px-3 py-2">{lot.make}</td>
                <td className="px-3 py-2 font-semibold">{lot.quantity.toFixed(3)}</td>
                <td className="px-3 py-2 text-gray-500">{lot.uidNo ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Assign quantities:</p>
          {selected.map((s) => (
            <div key={s.lot.id} className="flex items-center gap-3 bg-blue-50 rounded-lg px-3 py-2">
              <span className="text-sm flex-1 font-medium">{s.lot.grade} · {s.lot.size} · {s.lot.location}</span>
              <span className="text-xs text-gray-500">Avail: {s.lot.quantity.toFixed(3)}</span>
              {!filterByLocation && (
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max={s.lot.quantity}
                  value={s.assignedQty}
                  onChange={(e) => setAssigned(s.lot.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Qty"
                  className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              {filterByLocation && (
                <span className="text-sm font-semibold text-blue-700">{s.lot.quantity.toFixed(3)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
