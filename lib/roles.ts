export enum Role {
  ADMIN = "ADMIN",
  EXECUTIVE = "EXECUTIVE", 
  FINANCE = "FINANCE",
  DEPT_HEAD = "DEPT_HEAD",
  STAFF = "STAFF",
}

export const ROLE_COLORS: Record<Role, string> = {
  [Role.ADMIN]: "bg-red-100 text-red-800 border-red-300",
  [Role.EXECUTIVE]: "bg-blue-100 text-blue-800 border-blue-300",
  [Role.FINANCE]: "bg-green-100 text-green-800 border-green-300",
  [Role.DEPT_HEAD]: "bg-purple-100 text-purple-800 border-purple-300",
  [Role.STAFF]: "bg-gray-100 text-gray-800 border-gray-300",
};

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: "Admin",
  [Role.EXECUTIVE]: "Pimpinan",
  [Role.FINANCE]: "Keuangan",
  [Role.DEPT_HEAD]: "Kepala Bagian",
  [Role.STAFF]: "Staf",
};

export const ROLE_OPTIONS = Object.values(Role).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));