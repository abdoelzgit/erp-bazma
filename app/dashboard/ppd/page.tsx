import { PpdForm } from "@/components/ppd/ppd-form";
import { getPpdPageData } from "@/lib/ppd-data";

export const metadata = {
  title: "Permohonan Pencairan Dana (PPD) - ERP Bazma",
};

export default async function PpdPage() {
  const initialData = await getPpdPageData();
  return <PpdForm initialData={initialData} />;
}
