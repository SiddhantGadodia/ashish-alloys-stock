-- ============================================================
-- SCHEMA MIGRATION — run this in Supabase SQL Editor
-- Safe: all transactional tables (InternalTransfer, FinishedGoodsTransfer,
--       ProductionPlanning, Sale) should be empty already.
-- ============================================================

-- 1. InternalTransfer — drop old columns, add new JSON columns
ALTER TABLE "InternalTransfer"
  DROP COLUMN IF EXISTS "instrDate",
  DROP COLUMN IF EXISTS "instrGrade",
  DROP COLUMN IF EXISTS "instrSize",
  DROP COLUMN IF EXISTS "instrQuantity",
  DROP COLUMN IF EXISTS "instrMake",
  DROP COLUMN IF EXISTS "instrUidNo",
  DROP COLUMN IF EXISTS "instrPieces",
  DROP COLUMN IF EXISTS "instrSubLoc",
  DROP COLUMN IF EXISTS "instrSupplyCondition",
  DROP COLUMN IF EXISTS "instrLocationFrom",
  DROP COLUMN IF EXISTS "instrLocationTo",
  DROP COLUMN IF EXISTS "instrRemarks",
  DROP COLUMN IF EXISTS "instrDescription",
  DROP COLUMN IF EXISTS "actDate",
  DROP COLUMN IF EXISTS "actGrade",
  DROP COLUMN IF EXISTS "actSize",
  DROP COLUMN IF EXISTS "actQuantity",
  DROP COLUMN IF EXISTS "actMake",
  DROP COLUMN IF EXISTS "actUidNo",
  DROP COLUMN IF EXISTS "actPieces",
  DROP COLUMN IF EXISTS "actSubLoc",
  DROP COLUMN IF EXISTS "actSupplyCondition",
  DROP COLUMN IF EXISTS "actLocationFrom",
  DROP COLUMN IF EXISTS "actLocationTo",
  DROP COLUMN IF EXISTS "actRemarks",
  DROP COLUMN IF EXISTS "actDescription",
  DROP COLUMN IF EXISTS "lotSelections",
  DROP COLUMN IF EXISTS "createdLotId";

ALTER TABLE "InternalTransfer"
  ADD COLUMN IF NOT EXISTS "entryType"      TEXT NOT NULL DEFAULT 'instruction',
  ADD COLUMN IF NOT EXISTS "locationFrom"   TEXT,
  ADD COLUMN IF NOT EXISTS "instrLotsJson"  TEXT,
  ADD COLUMN IF NOT EXISTS "actLotsJson"    TEXT,
  ADD COLUMN IF NOT EXISTS "createdLotIds"  TEXT;

-- 2. ProductionPlanning — drop old columns, add new
ALTER TABLE "ProductionPlanning"
  DROP COLUMN IF EXISTS "date",
  DROP COLUMN IF EXISTS "grade",
  DROP COLUMN IF EXISTS "rmSize",
  DROP COLUMN IF EXISTS "quantity",
  DROP COLUMN IF EXISTS "make",
  DROP COLUMN IF EXISTS "conversionSizeTolerance",
  DROP COLUMN IF EXISTS "length",
  DROP COLUMN IF EXISTS "colourCode",
  DROP COLUMN IF EXISTS "machines",
  DROP COLUMN IF EXISTS "additionalInstruction",
  DROP COLUMN IF EXISTS "uidNo";

ALTER TABLE "ProductionPlanning"
  ADD COLUMN IF NOT EXISTS "locationInitial"  TEXT,
  ADD COLUMN IF NOT EXISTS "lotSectionsJson"  TEXT;

-- 3. FinishedGoodsTransfer — drop old columns, add new
ALTER TABLE "FinishedGoodsTransfer"
  DROP COLUMN IF EXISTS "date",
  DROP COLUMN IF EXISTS "gradeFinal",
  DROP COLUMN IF EXISTS "sizeFinal",
  DROP COLUMN IF EXISTS "quantityFinal",
  DROP COLUMN IF EXISTS "make",
  DROP COLUMN IF EXISTS "uidNo",
  DROP COLUMN IF EXISTS "pieces",
  DROP COLUMN IF EXISTS "subLocInitial",
  DROP COLUMN IF EXISTS "subLocFinal",
  DROP COLUMN IF EXISTS "supplyCondition",
  DROP COLUMN IF EXISTS "locationInitial",
  DROP COLUMN IF EXISTS "locationFinal",
  DROP COLUMN IF EXISTS "suspenseQty",
  DROP COLUMN IF EXISTS "remarks",
  DROP COLUMN IF EXISTS "sourceLotId",
  DROP COLUMN IF EXISTS "createdLotId";

ALTER TABLE "FinishedGoodsTransfer"
  ADD COLUMN IF NOT EXISTS "locationInitial"  TEXT,
  ADD COLUMN IF NOT EXISTS "lotSectionsJson"  TEXT,
  ADD COLUMN IF NOT EXISTS "createdLotIds"    TEXT;

-- 4. Sale — drop old columns, add new
ALTER TABLE "Sale"
  DROP COLUMN IF EXISTS "instrDate",
  DROP COLUMN IF EXISTS "instrGrade",
  DROP COLUMN IF EXISTS "instrSize",
  DROP COLUMN IF EXISTS "instrQuantity",
  DROP COLUMN IF EXISTS "instrMake",
  DROP COLUMN IF EXISTS "instrUidNo",
  DROP COLUMN IF EXISTS "instrPieces",
  DROP COLUMN IF EXISTS "instrSubLoc",
  DROP COLUMN IF EXISTS "instrSupplyCondition",
  DROP COLUMN IF EXISTS "instrCustomer",
  DROP COLUMN IF EXISTS "instrVehicleNo",
  DROP COLUMN IF EXISTS "instrRemarks",
  DROP COLUMN IF EXISTS "actDate",
  DROP COLUMN IF EXISTS "actGrade",
  DROP COLUMN IF EXISTS "actSize",
  DROP COLUMN IF EXISTS "actQuantity",
  DROP COLUMN IF EXISTS "actMake",
  DROP COLUMN IF EXISTS "actUidNo",
  DROP COLUMN IF EXISTS "actPieces",
  DROP COLUMN IF EXISTS "actSubLoc",
  DROP COLUMN IF EXISTS "actSupplyCondition",
  DROP COLUMN IF EXISTS "actCustomer",
  DROP COLUMN IF EXISTS "actVehicleNo",
  DROP COLUMN IF EXISTS "actRemarks",
  DROP COLUMN IF EXISTS "lotSelections";

ALTER TABLE "Sale"
  ADD COLUMN IF NOT EXISTS "entryType"      TEXT NOT NULL DEFAULT 'instruction',
  ADD COLUMN IF NOT EXISTS "locationFrom"   TEXT,
  ADD COLUMN IF NOT EXISTS "instrLotsJson"  TEXT,
  ADD COLUMN IF NOT EXISTS "actLotsJson"    TEXT;

-- 5. StockLot — add jwNo column
ALTER TABLE "StockLot"
  ADD COLUMN IF NOT EXISTS "jwNo" TEXT;

-- 6. ProductionPlanning — add actuals/verify columns
ALTER TABLE "ProductionPlanning"
  ADD COLUMN IF NOT EXISTS "status"            TEXT NOT NULL DEFAULT 'instruction',
  ADD COLUMN IF NOT EXISTS "entryType"         TEXT NOT NULL DEFAULT 'instruction',
  ADD COLUMN IF NOT EXISTS "actLotsJson"       TEXT,
  ADD COLUMN IF NOT EXISTS "actualsFilledById" TEXT,
  ADD COLUMN IF NOT EXISTS "actualsFilledAt"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "verifiedById"      TEXT,
  ADD COLUMN IF NOT EXISTS "verifiedAt"        TIMESTAMPTZ;

-- 7. Machine dropdown options
INSERT INTO "DropdownOption" (id, field, value, "isSystem", active)
VALUES
  (gen_random_uuid()::text, 'machine', 'M1', true, true),
  (gen_random_uuid()::text, 'machine', 'M2', true, true),
  (gen_random_uuid()::text, 'machine', 'M3', true, true),
  (gen_random_uuid()::text, 'machine', 'M4', true, true),
  (gen_random_uuid()::text, 'machine', 'M5', true, true),
  (gen_random_uuid()::text, 'machine', 'M6', true, true),
  (gen_random_uuid()::text, 'machine', 'M7', true, true),
  (gen_random_uuid()::text, 'machine', 'M8', true, true),
  (gen_random_uuid()::text, 'machine', 'M9', true, true)
ON CONFLICT (field, value) DO NOTHING;
