"use client";

import { useState, useMemo } from "react";
import { CheckCircleIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import type { Department } from "./department-view.types";
import { DepartmentSidebar } from "./components/department-sidebar";
import { DepartmentInfoCard } from "./components/department-info-card";
import { DepartmentBudgetCard } from "./components/department-budget-card";
import { DepartmentMembersCard } from "./components/department-members-card";
import { DepartmentDialogs } from "./components/department-dialogs";
import { Badge } from "@/components/ui/badge";
import {
  addDepartmentMemberAction,
  archiveDepartmentAction,
  createDepartmentAction,
  removeDepartmentMemberAction,
  updateDepartmentAction,
  updateDepartmentAnnualBudgetAction,
} from "@/app/actions/departments";

export function DepartmentView({ initialDepartments }: { initialDepartments: Department[] }) {
  const [departments, setDepartments] = useState<Department[]>(initialDepartments);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(initialDepartments[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("Semua");
  const [yearFilter, setYearFilter] = useState<string>(() => String(new Date().getFullYear()));
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("Semua");
  const [feedback, setFeedback] = useState<string | null>(null);

  // Modals
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAdjustBudgetOpen, setIsAdjustBudgetOpen] = useState(false);

  // Forms
  const [deptForm, setDeptForm] = useState({
    name: "",
    code: "",
    pic: "",
    description: "",
    totalBudget: 100000000,
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    role: "Anggota" as "Penanggung jawab" | "Anggota",
  });

  const [budgetForm, setBudgetForm] = useState(0);

  const activeDept = useMemo(() => {
    return departments.find((d) => d.id === selectedDeptId) || departments[0];
  }, [departments, selectedDeptId]);

  const summaryMetrics = useMemo(() => {
    const totalCount = departments.length;
    const activeCount = departments.filter((d) => d.status === "Aktif").length;
    const totalMembers = departments.reduce((acc, d) => acc + d.members.length, 0);
    const totalAllBudget = departments.reduce((acc, d) => acc + d.totalBudget, 0);
    return { totalCount, activeCount, totalMembers, totalAllBudget };
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      const matchSearch =
        dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "Semua" || dept.status === statusFilter;
      const matchYear = yearFilter === "Semua" || dept.year.toString() === yearFilter;
      return matchSearch && matchStatus && matchYear;
    });
  }, [departments, searchQuery, statusFilter, yearFilter]);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleOpenAddDept = () => {
    setDeptForm({
      name: "",
      code: "DPT-",
      pic: "",
      description: "",
      totalBudget: 150000000,
      status: "Aktif",
    });
    setIsAddDeptOpen(true);
  };

  const handleSaveNewDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code) return;
    const result = await createDepartmentAction({ ...deptForm, year: Number(yearFilter) || new Date().getFullYear() });
    if (result.error || !result.data) {
      showFeedback(result.error ?? "Gagal membuat departemen.");
      return;
    }

    setDepartments((prev) => [result.data!, ...prev]);
    setSelectedDeptId(result.data.id);
    setIsAddDeptOpen(false);
    showFeedback(`Departemen ${result.data.name} berhasil ditambahkan.`);
  };

  const handleOpenEditDept = () => {
    if (!activeDept) return;
    setDeptForm({
      name: activeDept.name,
      code: activeDept.code,
      pic: activeDept.pic,
      description: activeDept.description,
      totalBudget: activeDept.totalBudget,
      status: activeDept.status,
    });
    setIsEditDeptOpen(true);
  };

  const handleSaveEditDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDept) return;
    const result = await updateDepartmentAction({
      id: activeDept.id,
      ...deptForm,
      year: activeDept.year,
    });
    if (result.error || !result.data) {
      showFeedback(result.error ?? "Gagal memperbarui departemen.");
      return;
    }
    setDepartments((prev) => prev.map((department) => department.id === activeDept.id ? result.data! : department));
    setIsEditDeptOpen(false);
    showFeedback("Informasi departemen berhasil diperbarui.");
  };

  const handleDeleteDept = async () => {
    if (!activeDept) return;
    if (departments.filter((department) => department.status === "Aktif").length <= 1) {
      alert("Harus ada minimal 1 departemen di sistem.");
      return;
    }
    if (confirm(`Nonaktifkan departemen ${activeDept.name}? Data anggaran dan riwayatnya akan tetap disimpan.`)) {
      const result = await archiveDepartmentAction(activeDept.id);
      if (result.error) {
        showFeedback(result.error);
        return;
      }
      setDepartments((prev) => prev.map((department) => department.id === activeDept.id
        ? { ...department, status: "Nonaktif", updatedAt: "Hari ini" }
        : department));
      showFeedback(`Departemen ${activeDept.name} dinonaktifkan.`);
    }
  };

  const handleOpenAdjustBudget = () => {
    if (!activeDept) return;
    setBudgetForm(activeDept.totalBudget);
    setIsAdjustBudgetOpen(true);
  };

  const handleSaveAdjustBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDept) return;
    const result = await updateDepartmentAnnualBudgetAction({
      departmentId: activeDept.id,
      year: activeDept.year,
      amount: Number(budgetForm),
    });
    if (result.error) {
      showFeedback(result.error);
      return;
    }
    setDepartments((prev) => prev.map((department) => department.id === activeDept.id
      ? { ...department, totalBudget: Number(budgetForm), updatedAt: "Hari ini" }
      : department));
    setIsAdjustBudgetOpen(false);
    showFeedback("Anggaran departemen berhasil disesuaikan.");
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.name || !memberForm.email || !activeDept) return;
    const result = await addDepartmentMemberAction({
      departmentId: activeDept.id,
      name: memberForm.name,
      email: memberForm.email,
      role: memberForm.role,
      year: activeDept.year,
    });
    if (result.error || !result.data) {
      showFeedback(result.error ?? "Gagal menambahkan anggota.");
      return;
    }
    const newMember = result.data;
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === activeDept.id
          ? {
              ...d,
              members: [
                ...d.members.map((member) => memberForm.role === "Penanggung jawab" && member.role === "Penanggung jawab"
                  ? { ...member, role: "Anggota" as const }
                  : member),
                newMember,
              ],
              pic: memberForm.role === "Penanggung jawab" ? newMember.name : d.pic,
            }
          : d
      )
    );
    setMemberForm({ name: "", email: "", role: "Anggota" });
    setIsAddMemberOpen(false);
    showFeedback(`${newMember.name} berhasil ditambahkan ke departemen.`);
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!activeDept) return;
    if (confirm(`Keluarkan ${memberName} dari departemen ${activeDept.name}?`)) {
      const memberToRemove = activeDept.members.find((member) => member.id === memberId);
      const result = await removeDepartmentMemberAction({ departmentId: activeDept.id, memberId });
      if (result.error) {
        showFeedback(result.error);
        return;
      }
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === activeDept.id
            ? {
                ...d,
                members: d.members.filter((m) => m.id !== memberId),
              pic: memberToRemove?.role === "Penanggung jawab"
                ? d.members.find((member) => member.id !== memberId && member.role === "Penanggung jawab")?.name ?? "-"
                : d.pic,
              }
            : d
        )
      );
      showFeedback(`${memberName} telah dikeluarkan dari departemen.`);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-4rem)] bg-background">
      <DepartmentSidebar
        departments={filteredDepartments}
        selectedDeptId={selectedDeptId}
        onSelect={setSelectedDeptId}
        onAdd={handleOpenAddDept}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        year={yearFilter}
        onYearChange={setYearFilter}
      />

      <main className="flex-1 flex flex-col overflow-y-auto bg-background">
        {activeDept ? (
          <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span>Keuangan</span>
                <span>/</span>
                <span>Departemen</span>
                <span>/</span>
                <span className="text-foreground font-medium">{activeDept.name}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
                    {activeDept.name}
                  </h1>
                  <Badge
                    variant="outline"
                    className={`text-xs px-2 py-0.5 ${
                      activeDept.status === "Aktif"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {activeDept.status}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenEditDept}
                    className="gap-1.5 text-xs h-8 px-3 rounded-md border border-input hover:bg-muted inline-flex items-center"
                  >
                    <PencilSimpleIcon className="size-3.5" />
                    Edit departemen
                  </button>
                  <button
                    onClick={handleDeleteDept}
                    className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-8 px-3 rounded-md border inline-flex items-center"
                  >
                    Nonaktifkan
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {activeDept.code} · Diperbarui {activeDept.updatedAt} oleh {activeDept.updatedBy}
              </p>
            </div>

            {feedback && (
              <div className="flex items-center gap-2 p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-md">
                <CheckCircleIcon className="size-4 shrink-0" />
                <span>{feedback}</span>
              </div>
            )}

            <DepartmentInfoCard dept={activeDept} />
            <DepartmentBudgetCard dept={activeDept} onAdjustBudget={handleOpenAdjustBudget} />
            <DepartmentMembersCard
              dept={activeDept}
              memberSearch={memberSearch}
              onMemberSearchChange={setMemberSearch}
              memberRoleFilter={memberRoleFilter}
              onMemberRoleFilterChange={setMemberRoleFilter}
              onAddMember={() => setIsAddMemberOpen(true)}
              onRemoveMember={handleRemoveMember}
            />
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Pilih departemen di sebelah kiri untuk melihat detail.
          </div>
        )}
      </main>

      <DepartmentDialogs
        isAddOpen={isAddDeptOpen}
        onCloseAdd={() => setIsAddDeptOpen(false)}
        onSubmitAdd={handleSaveNewDept}
        deptForm={deptForm}
        onDeptFormChange={setDeptForm}
        isEditOpen={isEditDeptOpen}
        onCloseEdit={() => setIsEditDeptOpen(false)}
        onSubmitEdit={handleSaveEditDept}
        isBudgetOpen={isAdjustBudgetOpen}
        onCloseBudget={() => setIsAdjustBudgetOpen(false)}
        onSubmitBudget={handleSaveAdjustBudget}
        budgetVal={budgetForm}
        onBudgetValChange={setBudgetForm}
        activeDeptName={activeDept?.name}
        activeDeptYear={activeDept?.year}
        isMemberOpen={isAddMemberOpen}
        onCloseMember={() => setIsAddMemberOpen(false)}
        onSubmitMember={handleAddMember}
        memberForm={memberForm}
        onMemberFormChange={setMemberForm}
      />
    </div>
  );
}
