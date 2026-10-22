"use client";

import { useState, useMemo } from "react";
import { CheckCircleIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import type { Department, DepartmentUserOption } from "./department-view.types";
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
  deleteDepartmentAction,
  getDepartmentsByBudgetYearAction,
  removeDepartmentMemberAction,
  updateDepartmentAction,
} from "@/app/actions/departments";

export function DepartmentView({ initialDepartments, userOptions, canManageDepartments, canManageMembers, canManageAllMembers }: {
  initialDepartments: Department[];
  userOptions: DepartmentUserOption[];
  canManageDepartments: boolean;
  canManageMembers: boolean;
  canManageAllMembers: boolean;
}) {
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

  // Forms
  const [deptForm, setDeptForm] = useState({
    name: "",
    code: "",
    pic: "",
    description: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

  const [memberForm, setMemberForm] = useState({ userId: "" });

  const activeDept = useMemo(() => {
    return departments.find((d) => d.id === selectedDeptId) || departments[0];
  }, [departments, selectedDeptId]);

  const availableMemberUsers = useMemo(
    () => userOptions.filter((user) => !activeDept?.members.some(
      (member) => member.userId === user.id || member.email.toLowerCase() === user.email.toLowerCase(),
    )),
    [activeDept, userOptions],
  );

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

  const handleYearChange = async (value: string) => {
    setYearFilter(value);
    const year = value === "Semua" ? new Date().getFullYear() : Number(value);
    const result = await getDepartmentsByBudgetYearAction(year);
    if (result.error || !result.data) {
      showFeedback(result.error ?? "Gagal memuat anggaran departemen.");
      return;
    }
    setDepartments(result.data);
  };

  const handleOpenAddDept = () => {
    setDeptForm({
      name: "",
      code: "DPT-",
      pic: "",
      description: "",
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

  const handlePermanentDeleteDept = async () => {
    if (!activeDept) return;
    if (!confirm(`Hapus permanen departemen ${activeDept.name}? Departemen hanya dapat dihapus jika belum memiliki account budget atau riwayat PPD.`)) return;

    const result = await deleteDepartmentAction(activeDept.id);
    if (result.error) {
      showFeedback(result.error);
      return;
    }

    const remainingDepartments = departments.filter((department) => department.id !== activeDept.id);
    setDepartments(remainingDepartments);
    setSelectedDeptId(remainingDepartments[0]?.id ?? "");
    showFeedback(`Departemen ${activeDept.name} berhasil dihapus.`);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.userId || !activeDept) return;
    const result = await addDepartmentMemberAction({
      departmentId: activeDept.id,
      userId: memberForm.userId,
      year: activeDept.year,
    });
    if (result.error || !result.data) {
      showFeedback(result.error ?? "Gagal menambahkan anggota.");
      return;
    }
    const newMember = result.data;
    const isPic = newMember.role === "Penanggung jawab";
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === activeDept.id
          ? {
              ...d,
              members: [
                ...d.members.map((member) => isPic && member.role === "Penanggung jawab"
                  ? { ...member, role: "Anggota" as const }
                  : member),
                newMember,
              ],
              pic: isPic ? newMember.name : d.pic,
            }
          : d
      )
    );
    setMemberForm({ userId: "" });
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
    <div className="flex min-h-[calc(100svh-4rem)] flex-col bg-background lg:h-svh lg:min-h-0 lg:flex-row">
      <DepartmentSidebar
        departments={filteredDepartments}
        selectedDeptId={selectedDeptId}
        onSelect={setSelectedDeptId}
        onAdd={handleOpenAddDept}
        canManageDepartments={canManageDepartments}
        emptyMessage={initialDepartments.length === 0
          ? (canManageDepartments ? "Belum ada departemen." : "Anda belum ditugaskan ke departemen aktif. Hubungi Admin untuk meminta akses.")
          : "Tidak ada departemen yang sesuai dengan filter."}
        search={searchQuery}
        onSearchChange={setSearchQuery}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        year={yearFilter}
        onYearChange={handleYearChange}
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-background">
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

                {canManageDepartments && <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenEditDept}
                    className="gap-1.5 text-xs h-8 px-3 rounded-md border border-input hover:bg-muted inline-flex items-center"
                  >
                    <PencilSimpleIcon className="size-3.5" />
                    Edit departemen
                  </button>
               
                  <button
                    onClick={handlePermanentDeleteDept}
                    aria-label={`Hapus permanen departemen ${activeDept.name}`}
                    title="Hapus permanen departemen yang belum memiliki riwayat"
                    className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-8 w-8 rounded-md border inline-flex items-center justify-center"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>}
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
            <DepartmentBudgetCard dept={activeDept} />
            <DepartmentMembersCard
              dept={activeDept}
              memberSearch={memberSearch}
              onMemberSearchChange={setMemberSearch}
              memberRoleFilter={memberRoleFilter}
              onMemberRoleFilterChange={setMemberRoleFilter}
              canManageMembers={canManageMembers}
              canManageAllMembers={canManageAllMembers}
              onAddMember={() => { setMemberForm({ userId: "" }); setIsAddMemberOpen(true); }}
              onRemoveMember={handleRemoveMember}
            />
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground text-sm">
            {initialDepartments.length === 0
              ? (canManageDepartments ? "Belum ada departemen untuk ditampilkan." : "Belum ada departemen aktif yang ditugaskan ke akun Anda. Hubungi Admin untuk meminta akses.")
              : "Tidak ada departemen yang sesuai dengan filter."}
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
        isMemberOpen={isAddMemberOpen}
        onCloseMember={() => setIsAddMemberOpen(false)}
        onSubmitMember={handleAddMember}
        memberForm={memberForm}
        onMemberFormChange={setMemberForm}
        memberUsers={availableMemberUsers}
      />
    </div>
  );
}
