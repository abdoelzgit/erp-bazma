export const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const YEARS = Array.from({ length: 7 }, (_, index) => new Date().getFullYear() - 3 + index);
