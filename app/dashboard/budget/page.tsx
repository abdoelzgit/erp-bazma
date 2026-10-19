import { BudgetView } from "@/components/budget/budget-view";
import { getBudgetPageData } from "@/lib/budget-data";
import { canManageBudget } from "@/lib/budget-permissions";

export const metadata = {
  title: "Anggaran & Alokasi - ERP Bazma",
  description: "Pengelolaan total plafon anggaran dan alokasi departemen SMK TI Bazma",
};

export default async function BudgetPage() {
  const [initialData, canManage] = await Promise.all([
    getBudgetPageData(),
    canManageBudget(),
  ]);
  return <BudgetView initialData={initialData} canManage={canManage} />;
}
