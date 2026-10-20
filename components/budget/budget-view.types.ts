export type Department = { 
  id: string; 
  name: string; 
  code: string; 
};

export type Account = { 
  id: string; 
  deptId: string; 
  code: string; 
  name: string; 
  isActive: boolean;
};

export type BudgetEntry = { 
  amount: number; 
  realized: number; 
};

export type DrafLogItem = {
  id: string;
  accountId: string;
  year: number;
  month: number;
  createdAt: string;
  description: string;
  ppdNo: string;
  amount: number; // + ditahan, - dilepas / dipindah ke realisasi
};

export type BudgetRow = {
  account: Account;
  hasBudget: boolean;
  amount: number;
  draf: number;
  realized: number;
  saldo: number; // Budget - Realisasi - Draf
};

export type DepartmentSummary = {
  dept: Department;
  accountCount: number;
  missing: number;
  total: number;
};
