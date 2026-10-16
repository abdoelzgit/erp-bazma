export type Member = {
  id: string;
  name: string;
  email: string;
  role: "Penanggung jawab" | "Anggota";
  status: "Aktif" | "Nonaktif";
};

export type Department = {
  id: string;
  name: string;
  code: string;
  status: "Aktif" | "Nonaktif";
  pic: string;
  description: string;
  totalBudget: number;
  usedBudget: number;
  year: number;
  updatedAt: string;
  updatedBy: string;
  members: Member[];
};
