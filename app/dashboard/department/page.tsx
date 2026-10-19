import { connection } from "next/server";
import { DepartmentView } from "@/components/department/department-view";
import { getDepartmentsForView } from "@/lib/department-data";

export const metadata = {
  title: "Departemen - ERP Bazma",
};

export default async function DepartmentPage() {
  await connection();
  const departments = await getDepartmentsForView(new Date().getFullYear());
  return <DepartmentView initialDepartments={departments} />;
}
