import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rows = [
  { date: "2024-08-31", grade: "SAE-8620", size: "19", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.471, pieces: 2, length: null, uidNo: null },
  { date: "2024-09-01", grade: "SAE-8620", size: "19", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 3.817, pieces: 2, length: null, uidNo: null },
  { date: "2025-08-14", grade: "EN-31", size: "14.2", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.160, pieces: 1, length: 10, uidNo: null },
  { date: "2025-08-14", grade: "EN-31", size: "15.3", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.390, pieces: 1, length: 10, uidNo: null },
  { date: "2025-08-24", grade: "15CRNI6(ANN)", size: "42", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.600, pieces: 1, length: 10, uidNo: null },
  { date: "2025-08-25", grade: "EN-1A(L)", size: "23.50 HEX", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.431, pieces: 1, length: null, uidNo: null },
  { date: "2025-08-25", grade: "EN-1A", size: "25.50 HEX", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.908, pieces: 2, length: null, uidNo: null },
  { date: "2025-10-01", grade: "EN-31", size: "16.3", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "742", quantity: 0.805, pieces: 1, length: 10, uidNo: "9MB34" },
  { date: "2025-10-01", grade: "16MNCR5", size: "24.2", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.284, pieces: 1, length: 10, uidNo: "9MB41" },
  { date: "2025-10-18", grade: "SAE-1541", size: "24", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.000, pieces: 1, length: null, uidNo: "10MB41" },
  { date: "2025-11-03", grade: "EN-8M", size: "20", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.600, pieces: 1, length: 10, uidNo: null },
  { date: "2025-11-19", grade: "SCR-420", size: "60", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "742", quantity: 2.000, pieces: 1, length: 16, uidNo: "11MB34" },
  { date: "2025-11-20", grade: "SCR-420", size: "60.65", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "742", quantity: 1.094, pieces: 1, length: 18, uidNo: "11MB44" },
  { date: "2025-11-20", grade: "20MNCR5", size: "60", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.628, pieces: 1, length: 10, uidNo: "11MB85" },
  { date: "2025-11-22", grade: "SCM-420", size: "26", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "742", quantity: 1.120, pieces: 1, length: null, uidNo: "11MB87" },
  { date: "2025-11-22", grade: "SCR-420", size: "60", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "742", quantity: 0.800, pieces: 1, length: null, uidNo: "11MB101" },
  { date: "2025-11-22", grade: "SCR-420", size: "60", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "742", quantity: 1.216, pieces: 1, length: null, uidNo: "11MB111" },
  { date: "2025-11-22", grade: "SCM-420", size: "26.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "742", quantity: 1.538, pieces: 1, length: null, uidNo: "11MB112" },
  { date: "2025-11-24", grade: "SCM-420", size: "22", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "742", quantity: 0.898, pieces: 1, length: 19, uidNo: "11MB130" },
  { date: "2025-11-24", grade: "SCM-420", size: "22", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "742", quantity: 1.014, pieces: 1, length: 19, uidNo: "11MB136" },
  { date: "2025-12-25", grade: "SCM-415", size: "30.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.016, pieces: 1, length: 16, uidNo: "12MB31" },
  { date: "2025-12-27", grade: "EN-19", size: "13", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.765, pieces: 1, length: 10, uidNo: "DARUKHANA" },
  { date: "2026-01-09", grade: "EN-1A(L)", size: "46.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.358, pieces: 1, length: 10, uidNo: "1BB17" },
  { date: "2026-01-09", grade: "EN-8D", size: "43.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.406, pieces: 1, length: 19, uidNo: "1BB39" },
  { date: "2026-01-11", grade: "20MNCR5", size: "50", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.450, pieces: 1, length: 18, uidNo: "1HB2" },
  { date: "2026-01-14", grade: "EN-1A(L)", size: "17 HEX", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.166, pieces: 1, length: 10, uidNo: null },
  { date: "2026-01-17", grade: "SAE-1541", size: "33", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.673, pieces: 1, length: 10, uidNo: null },
  { date: "2026-01-24", grade: "EN-31", size: "16.65", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.042, pieces: 1, length: 10, uidNo: "1MB8" },
  { date: "2026-01-25", grade: "EN-1A", size: "34 HEX", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.925, pieces: 1, length: null, uidNo: "1BH7" },
  { date: "2026-01-25", grade: "EN-31", size: "16.3", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.862, pieces: 1, length: 10, uidNo: "1MB19" },
  { date: "2026-02-03", grade: "EN-1A(L)", size: "19 HEX", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.025, pieces: 1, length: null, uidNo: "DARUKHANA" },
  { date: "2026-02-03", grade: "EN-24", size: "24 HEX", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.463, pieces: 1, length: null, uidNo: "DARUKHANA" },
  { date: "2026-02-26", grade: "EN-1A(L)", size: "38", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.418, pieces: 1, length: null, uidNo: "2BB26" },
  { date: "2026-02-26", grade: "CK-45", size: "12 HEX", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.406, pieces: 1, length: null, uidNo: "2BB31" },
  { date: "2026-02-26", grade: "CK-45", size: "12 HEX", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.042, pieces: 1, length: null, uidNo: "2BB45" },
  { date: "2026-03-01", grade: "SCM-420", size: "32", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.569, pieces: 1, length: 10, uidNo: null },
  { date: "2026-03-04", grade: "SCM-420", size: "32", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.582, pieces: 1, length: 10, uidNo: null },
  { date: "2026-03-07", grade: "SCM-420", size: "32", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.120, pieces: 1, length: 10, uidNo: null },
  { date: "2026-03-16", grade: "SCM-420", size: "26", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.380, pieces: 1, length: null, uidNo: "DARUKHANA" },
  { date: "2026-03-29", grade: "SCM-420", size: "26", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.330, pieces: 1, length: null, uidNo: "3MB6" },
  { date: "2026-03-29", grade: "16MNCR5", size: "28", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.514, pieces: 1, length: null, uidNo: "3MB9" },
  { date: "2026-03-29", grade: "SCM-420", size: "25.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.146, pieces: 1, length: null, uidNo: "3MB10" },
  { date: "2026-03-29", grade: "16MNCR5", size: "28", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.384, pieces: 1, length: null, uidNo: "3MB11" },
  { date: "2026-03-29", grade: "EN-1A(L)", size: "71.6", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.812, pieces: 1, length: null, uidNo: "3MB14" },
  { date: "2026-03-29", grade: "SCM-420", size: "26.4", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.186, pieces: 1, length: null, uidNo: "3MB17" },
  { date: "2026-03-29", grade: "SCM-420", size: "26", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.926, pieces: 1, length: null, uidNo: "3MB18" },
  { date: "2026-03-30", grade: "SAE-1055", size: "60", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.795, pieces: 1, length: null, uidNo: "3M21" },
  { date: "2026-04-02", grade: "EN-31", size: "9", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.825, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-04-02", grade: "16MNCR5", size: "57.1", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 3.320, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-04-02", grade: "MS", size: "46 HEX", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.720, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-04-03", grade: "EN-1A(L)", size: "6.15", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.120, pieces: 1, length: 10, uidNo: null },
  { date: "2026-04-09", grade: "SAE-8620", size: "16", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.225, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-04-15", grade: "16MNCR5", size: "32", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.014, pieces: 1, length: 10, uidNo: null },
  // rows 53-57 skipped (no date or location)
  { date: "2026-04-19", grade: "EN-31", size: "12.3", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.480, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-04-22", grade: "16MNCR5", size: "25.4", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.165, pieces: 1, length: 10, uidNo: null },
  { date: "2026-04-24", grade: "SCM-420", size: "26.3", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.540, pieces: 1, length: 18, uidNo: "4MB1" },
  { date: "2026-04-24", grade: "SCM-420", size: "25", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.200, pieces: 1, length: 18, uidNo: "4MB5" },
  { date: "2026-04-24", grade: "SAE-1140", size: "25.4", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.412, pieces: 1, length: 10, uidNo: "4MB8" },
  { date: "2026-04-24", grade: "SCM-420", size: "26.6", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.260, pieces: 1, length: 18, uidNo: "4MB29" },
  { date: "2026-04-24", grade: "SCM-420", size: "47", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.486, pieces: 1, length: 18, uidNo: "4MB31" },
  { date: "2026-05-05", grade: "EN-1A(L)", size: "30", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.518, pieces: 1, length: 10, uidNo: null },
  { date: "2026-05-17", grade: "16MNCR5", size: "29", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.535, pieces: 1, length: null, uidNo: "SAIRAM" },
  { date: "2026-05-17", grade: "16MNCR5", size: "29", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.260, pieces: 1, length: null, uidNo: "SAIRAM" },
  { date: "2026-05-19", grade: "EN-1A(L)", size: "30", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.552, pieces: 1, length: 10, uidNo: null },
  { date: "2026-05-19", grade: "SCR-420", size: "29.3", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.272, pieces: 1, length: 20, uidNo: "5SP1" },
  { date: "2026-05-19", grade: "41CR4", size: "40", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.495, pieces: 1, length: 10, uidNo: "5SP13" },
  { date: "2026-05-19", grade: "EN-1A", size: "60.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.460, pieces: 1, length: 18, uidNo: "5SP16" },
  { date: "2026-05-19", grade: "EN-1A", size: "65", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.751, pieces: 1, length: 18, uidNo: "5SP19" },
  { date: "2026-05-19", grade: "EN-1A", size: "60.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.232, pieces: 1, length: 18, uidNo: "5SP20" },
  { date: "2026-05-19", grade: "EN-1A", size: "60.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.640, pieces: 1, length: 18, uidNo: "5SP21" },
  { date: "2026-05-19", grade: "20MNCR5", size: "30.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.374, pieces: 1, length: 12, uidNo: "5SP22" },
  { date: "2026-05-19", grade: "20MNCR5", size: "30.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.818, pieces: 1, length: null, uidNo: "5SP23" },
  { date: "2026-05-20", grade: "EN-8", size: "19 HEX", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.808, pieces: 1, length: 10, uidNo: "5M1" },
  { date: "2026-05-20", grade: "SAE-52100", size: "13", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.978, pieces: 1, length: 10, uidNo: "5M5" },
  { date: "2026-05-20", grade: "SAE-52100", size: "13", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.202, pieces: 1, length: 10, uidNo: "5M7" },
  { date: "2026-05-20", grade: "SAE-52100", size: "13.55", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.306, pieces: 1, length: 10, uidNo: "5M8" },
  { date: "2026-05-20", grade: "20MNCR5", size: "34", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 4.893, pieces: 1, length: 20, uidNo: "5M14" },
  { date: "2026-05-20", grade: "EN-1A(L)", size: "24", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.130, pieces: 1, length: 20, uidNo: "5M116" },
  { date: "2026-05-20", grade: "EN-1A(L)", size: "27", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.911, pieces: 1, length: 18, uidNo: "5M18" },
  { date: "2026-05-20", grade: "EN-1A", size: "30.5", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.829, pieces: 1, length: 18, uidNo: "5M19" },
  { date: "2026-05-20", grade: "EN-1A(L)", size: "28.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.746, pieces: 1, length: 20, uidNo: "5M20" },
  { date: "2026-05-20", grade: "EN-1A", size: "27.3", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.795, pieces: 1, length: 20, uidNo: "5M21" },
  { date: "2026-05-20", grade: "EN-1A", size: "32", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.643, pieces: 1, length: 18, uidNo: "5M22" },
  { date: "2026-05-20", grade: "EN-1A", size: "32.4", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.352, pieces: 1, length: 18, uidNo: "5M23" },
  { date: "2026-05-20", grade: "20MNCR5", size: "32", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.104, pieces: 1, length: 18, uidNo: "5M24" },
  { date: "2026-05-21", grade: "SCM-420", size: "23.3", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.142, pieces: 1, length: 16, uidNo: "5M25" },
  { date: "2026-05-21", grade: "SAE-52100", size: "15", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.878, pieces: 1, length: 16, uidNo: "5M26" },
  { date: "2026-05-21", grade: "EN-8", size: "62", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.530, pieces: 1, length: 16, uidNo: "5M27" },
  { date: "2026-05-21", grade: "SCM-420", size: "54.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.402, pieces: 1, length: 16, uidNo: "5M28" },
  { date: "2026-05-21", grade: "38MNVS6", size: "22.2", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.422, pieces: 1, length: 12, uidNo: "5M29" },
  { date: "2026-05-21", grade: "SCM-420", size: "28.47", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.148, pieces: 1, length: 10, uidNo: "5M30" },
  { date: "2026-05-21", grade: "SCR-420", size: "50", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.271, pieces: 1, length: 12, uidNo: "5M31" },
  { date: "2026-05-21", grade: "SAE-1140", size: "53", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.220, pieces: 1, length: 18, uidNo: "5M32" },
  { date: "2026-05-21", grade: "SAE-9254", size: "15.2", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.188, pieces: 1, length: 18, uidNo: "5M34" },
  { date: "2026-05-21", grade: "20MNCR5", size: "14.8", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.308, pieces: 1, length: 18, uidNo: "5M35" },
  { date: "2026-05-21", grade: "SCM-420", size: "20.3", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.200, pieces: 1, length: 18, uidNo: "5M36" },
  { date: "2026-05-21", grade: "EN-8", size: "22", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.350, pieces: 1, length: 14, uidNo: "5M37" },
  { date: "2026-05-21", grade: "SCM-420", size: "22", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.562, pieces: 1, length: 18, uidNo: "5M38" },
  { date: "2026-05-21", grade: "SCM-420", size: "30.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.292, pieces: 1, length: 18, uidNo: "5M39" },
  { date: "2026-05-21", grade: "SCM-420", size: "36.4", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.250, pieces: 1, length: 18, uidNo: "5M40" },
  { date: "2026-05-21", grade: "SAE-52100", size: "32.8", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.082, pieces: 1, length: 8, uidNo: "5M42" },
  { date: "2026-05-21", grade: "SAE-52100", size: "13.55", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.272, pieces: 1, length: 10, uidNo: "5M43" },
  { date: "2026-05-21", grade: "SAE-52100", size: "13.55", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.000, pieces: 1, length: 10, uidNo: "5M44" },
  { date: "2026-05-21", grade: "SAE-52100", size: "15", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.288, pieces: 1, length: 14, uidNo: "5M45" },
  { date: "2026-05-21", grade: "SAE-52100", size: "13", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.444, pieces: 1, length: 10, uidNo: "5M46" },
  { date: "2026-05-21", grade: "20MNCR5", size: "34", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.898, pieces: 1, length: 20, uidNo: "5M47" },
  { date: "2026-05-21", grade: "20MNCR5", size: "48", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.706, pieces: 1, length: 16, uidNo: "5M48" },
  { date: "2026-05-21", grade: "EN-353", size: "34", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.098, pieces: 1, length: 18, uidNo: "5M49" },
  { date: "2026-05-21", grade: "EN-1A", size: "28.5", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.298, pieces: 1, length: 16, uidNo: "5M52" },
  { date: "2026-05-21", grade: "SAE-4140", size: "56", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.470, pieces: 1, length: 16, uidNo: "5M60" },
  { date: "2026-05-24", grade: "EN-1A(L)", size: "30", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.497, pieces: 1, length: 10, uidNo: null },
  { date: "2026-05-25", grade: "SCM-420", size: "38", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.080, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-05-25", grade: "20MNCR5", size: "42", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.000, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-05-25", grade: "SAE-52100", size: "10", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.290, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-05-25", grade: "SAE-52100", size: "11.2", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.795, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-05-25", grade: "SCR-440", size: "17", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.115, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-05-25", grade: "SCR-440", size: "18", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.095, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-05-25", grade: "SCR-440", size: "18.5", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.280, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-05-25", grade: "16MNCR5", size: "16.35", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.915, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-05-25", grade: "SAE-8620", size: "16.35", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.290, pieces: 1, length: 10, uidNo: "SAIRAM" },
  { date: "2026-05-25", grade: "EN-1A(L)", size: "30", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.614, pieces: 1, length: 10, uidNo: null },
  { date: "2026-05-27", grade: "SAE-4150", size: "40", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.518, pieces: 1, length: 22, uidNo: "5B1" },
  { date: "2026-05-27", grade: "SAE-4150", size: "34", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.319, pieces: 1, length: 12, uidNo: "5B4" },
  { date: "2026-05-27", grade: "SAE-4150", size: "34", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.614, pieces: 1, length: 10, uidNo: "5B5" },
  { date: "2026-05-27", grade: "SAE-4150", size: "36", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.476, pieces: 1, length: 14, uidNo: "5B6" },
  { date: "2026-05-27", grade: "SAE-4150", size: "34", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.492, pieces: 1, length: 16, uidNo: "5B8" },
  { date: "2026-05-27", grade: "SAE-4150", size: "36", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.979, pieces: 1, length: 16, uidNo: "5B9" },
  { date: "2026-05-27", grade: "SAE-4150", size: "34", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.325, pieces: 1, length: 10, uidNo: "5B11" },
  { date: "2026-05-27", grade: "SAE-4150", size: "36", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.558, pieces: 1, length: 14, uidNo: "5B15" },
  { date: "2026-05-27", grade: "SAE-4150", size: "22", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.986, pieces: 1, length: 10, uidNo: "5B16" },
  { date: "2026-05-27", grade: "SAE-4150", size: "23", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.726, pieces: 1, length: 20, uidNo: "5B19" },
  { date: "2026-05-27", grade: "SAE-4150", size: "23", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.158, pieces: 1, length: 20, uidNo: "5B20" },
  { date: "2026-05-27", grade: "SAE-4150", size: "41", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.340, pieces: 1, length: 19, uidNo: "5B24" },
  { date: "2026-05-27", grade: "SAE-4150", size: "36", supplyCondition: "BLACK BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.982, pieces: 1, length: 16, uidNo: "5B25" },
  { date: "2026-05-29", grade: "EN-1A", size: "30.6", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.390, pieces: 1, length: 10, uidNo: null },
  { date: "2026-05-29", grade: "EN-1A", size: "30.6", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.403, pieces: 1, length: 10, uidNo: null },
  { date: "2026-06-01", grade: "16MNCR5", size: "18.3", supplyCondition: "ROUND BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.710, pieces: 1, length: null, uidNo: "SAIRAM" },
  { date: "2026-06-01", grade: "SAE-52100", size: "12", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 2.330, pieces: 1, length: null, uidNo: "SAIRAM" },
  { date: "2026-06-01", grade: "EN-1A", size: "30.6", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.220, pieces: 1, length: 10, uidNo: null },
  { date: "2026-06-01", grade: "EN-1A", size: "30.6", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.616, pieces: 1, length: 10, uidNo: null },
  { date: "2026-06-01", grade: "EN-1A", size: "30.6", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.593, pieces: 1, length: 10, uidNo: null },
  { date: "2026-06-01", grade: "EN-1A", size: "30.6", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 1.257, pieces: 1, length: 10, uidNo: null },
  { date: "2026-06-01", grade: "EN-31", size: "7.85", supplyCondition: "BRIGHT BAR", make: "MSSSL-Hospet", description: "Non-Prime", location: "1325", quantity: 0.827, pieces: 1, length: 10, uidNo: null },
];

// Collect all unique values for dropdown seeding
const newGrades = [...new Set(rows.map(r => r.grade))];
const newSizes = [...new Set(rows.map(r => r.size))];
const newConditions = [...new Set(rows.map(r => r.supplyCondition))];

async function main() {
  // Seed any missing dropdown options
  for (const value of newGrades) {
    await prisma.dropdownOption.upsert({
      where: { field_value: { field: "grade", value } },
      update: {},
      create: { field: "grade", value, isSystem: false },
    });
  }
  for (const value of newSizes) {
    await prisma.dropdownOption.upsert({
      where: { field_value: { field: "size", value } },
      update: {},
      create: { field: "size", value, isSystem: false },
    });
  }
  for (const value of newConditions) {
    await prisma.dropdownOption.upsert({
      where: { field_value: { field: "supplyCondition", value } },
      update: {},
      create: { field: "supplyCondition", value, isSystem: false },
    });
  }

  // Find the Ashish user to attribute the import to
  const ashish = await prisma.user.findUnique({ where: { name: "Ashish" } });
  if (!ashish) throw new Error("Ashish user not found");

  let created = 0;
  for (const row of rows) {
    const entry = await prisma.purchaseEntry.create({
      data: {
        date: new Date(row.date),
        grade: row.grade,
        size: row.size,
        supplyCondition: row.supplyCondition,
        make: row.make,
        quantity: row.quantity,
        pieces: row.pieces,
        length: row.length,
        description: row.description,
        location: row.location,
        uidNo: row.uidNo,
        remarks: null,
        createdById: ashish.id,
      },
    });
    const lot = await prisma.stockLot.create({
      data: {
        grade: row.grade,
        size: row.size,
        supplyCondition: row.supplyCondition,
        make: row.make,
        location: row.location,
        quantity: row.quantity,
        pieces: row.pieces,
        length: row.length,
        description: row.description,
        uidNo: row.uidNo,
        remarks: null,
        dateCreated: new Date(row.date),
        originForm: "purchase",
        originId: entry.id,
      },
    });
    await prisma.purchaseEntry.update({ where: { id: entry.id }, data: { stockLotId: lot.id } });
    created++;
  }

  console.log(`Imported ${created} lots.`);
  // Notes on skipped rows
  console.log("Skipped 5 rows (rows 53–57) — no date or location.");
  console.log("Fixed 4 rows with year 2062 → 2026 (rows 60, 62, 63, 64).");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
