import { redirect } from "next/navigation";

export const metadata = { title: "Approval PPD - ERP Bazma" };

export default async function PpdApprovalPage() {
  redirect("/dashboard/ppd");
}
