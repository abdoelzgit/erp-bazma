"use client";

import { useState, useMemo } from "react";
import { CheckCircleIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import type { Department, Member } from "./department-view.types";
import { INITIAL_DEPARTMENTS } from "./department-view.data";
import { DepartmentSidebar } from "./components/department-sidebar";
import { DepartmentInfoCard } from "./components/department-info-card";
import { DepartmentBudgetCard } from "./components/department-budget-card";
import { DepartmentMembersCard } from "./components/department-members-card";
import { DepartmentDialogs } from "./components/department-dialogs";
import { Badge } from "@/components/ui/badge";

export function DepartmentView() {
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("dept-1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("Semua");
  const [yearFilter, setYearFilter] = useState<string>("2026");
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

  const handleSaveNewDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code) return;

    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: deptForm.name,
      code: deptForm.code.toUpperCase(),
      status: deptForm.status,
      pic: deptForm.pic || "-",
      description: deptForm.description,
      totalBudget: Number(deptForm.totalBudget) || 0,
      usedBudget: 0,
      year: 2026,
      updatedAt: "Hari ini",
      updatedBy: "Admin",
      members: deptForm.pic
        ? [
            {
              id: `mem-${Date.now()}`,
              name: deptForm.pic,
              email: `${deptForm.pic.toLowerCase().replace(/\s+/g, ".")}@nusantara.co.id`,
              role: "Penanggung jawab",
              status: "Aktif",
            },
          ]
        : [],
    };

    setDepartments((prev) => [newDept, ...prev]);
    setSelectedDeptId(newDept.id);
    setIsAddDeptOpen(false);
    showFeedback(`Departemen ${newDept.name} berhasil ditambahkan.`);
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

  const handleSaveEditDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDept) return;

    setDepartments((prev) =>
      prev.map((d) =>
        d.id === activeDept.id
          ? {
              ...d,
              name: deptForm.name,
              code: deptForm.code,
              pic: deptForm.pic,
              description: deptForm.description,
              status: deptForm.status,
              updatedAt: "Hari ini",
            }
          : d
      )
    );
    setIsEditDeptOpen(false);
    showFeedback("Informasi departemen berhasil diperbarui.");
  };

  const handleDeleteDept = () => {
    if (!activeDept) return;
    if (departments.length <= 1) {
      alert("Harus ada minimal 1 departemen di sistem.");
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus departemen ${activeDept.name}?`)) {
      const remaining = departments.filter((d) => d.id !== activeDept.id);
      setDepartments(remaining);
      setSelectedDeptId(remaining[0].id);
      showFeedback(`Departemen ${activeDept.name} telah dihapus.`);
    }
  };

  const handleOpenAdjustBudget = () => {
    if (!activeDept) return;
    setBudgetForm(activeDept.totalBudget);
    setIsAdjustBudgetOpen(true);
  };

  const handleSaveAdjustBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDept) return;

    setDepartments((prev) =>
      prev.map((d) =>
        d.id === activeDept.id
          ? {
              ...d,
              totalBudget: Number(budgetForm),
              updatedAt: "Hari ini",
            }
          : d
      )
    );
    setIsAdjustBudgetOpen(false);
    showFeedback("Anggaran departemen berhasil disesuaikan.");
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.name || !memberForm.email || !activeDept) return;

    const newMember: Member = {
      id: `mem-${Date.now()}`,
      name: memberForm.name,
      email: memberForm.email,
      role: memberForm.role,
      status: "Aktif",
    };

    setDepartments((prev) =>
      prev.map((d) =>
        d.id === activeDept.id
          ? {
              ...d,
              members: [...d.members, newMember],
              pic: memberForm.role === "Penanggung jawab" ? memberForm.name : d.pic,
            }
          : d
      )
    );
    setMemberForm({ name: "", email: "", role: "Anggota" });
    setIsAddMemberOpen(false);
    showFeedback(`${newMember.name} berhasil ditambahkan ke departemen.`);
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    if (!activeDept) return;
    if (confirm(`Keluarkan ${memberName} dari departemen ${activeDept.name}?`)) {
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === activeDept.id
            ? {
                ...d,
                members: d.members.filter((m) => m.id !== memberId),
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
                    Hapus
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
