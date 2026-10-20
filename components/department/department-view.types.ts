export type DepartmentUserRole = "ADMIN" | "EXECUTIVE" | "FINANCE" | "DEPT_HEAD" | "STAFF";

export type DepartmentUserOption = {
  id: string;
  name: string | null;
  email: string;
  role: DepartmentUserRole;
};

export type Member = {
  id: string;
  userId: string | null;
  name: string;
  email: string;
  userRole: DepartmentUserRole | null;
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
