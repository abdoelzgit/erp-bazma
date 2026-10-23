import { PpdApproval } from "@/components/ppd/ppd-approval";
import { PpdForm } from "@/components/ppd/ppd-form";
import { getPpdPageData } from "@/lib/ppd-data";
import { getPpdApprovalQueueData } from "@/lib/ppd-approval-data";

export const metadata = {
  title: "Permohonan Pencairan Dana (PPD) - ERP Bazma",
};

export default async function PpdPage() {
  const approvalQueue = await getPpdApprovalQueueData();
  const approvalRoles = ["ADMIN", "DEPT_HEAD", "FINANCE", "EXECUTIVE"];
  if (approvalQueue.role && approvalRoles.includes(approvalQueue.role)) {
    return <PpdApproval role={approvalQueue.role} initialItems={approvalQueue.items} />;
  }

  const initialData = await getPpdPageData();
  return <PpdForm initialData={initialData} />;
}
