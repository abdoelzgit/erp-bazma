"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  TrashIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  UsersIcon,
  CurrencyCircleDollarIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: "Penanggung jawab" | "Anggota";
  status: "Aktif" | "Nonaktif";
};

export type Department = {
  id: string;
  name: string;
  code: string;
  status: "Aktif" | "Nonaktif";
  pic: string;
  description: string;
  totalBudget: number;
  usedBudget: number;
  year: number;
  updatedAt: string;
  updatedBy: string;
  members: Member[];
};

const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: "dept-1",
    name: "Pemasaran",
    code: "DPT-MKT",
    status: "Aktif",
    pic: "Dina Lestari",
    description: "Mengelola kampanye pemasaran, komunikasi merek, dan akuisisi pelanggan.",
    totalBudget: 240000000,
    usedBudget: 72000000,
    year: 2026,
    updatedAt: "12 Oktober 2026",
    updatedBy: "Andi Pratama",
    members: [
      {
        id: "mem-1",
        name: "Dina Lestari",
        email: "dina.lestari@nusantara.co.id",
        role: "Penanggung jawab",
        status: "Aktif",
      },
      {
        id: "mem-2",
        name: "Rizky Saputra",
        email: "rizky.saputra@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
      {
        id: "mem-3",
        name: "Nadia Putri",
        email: "nadia.putri@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
      {
        id: "mem-4",
        name: "Fajar Hidayat",
        email: "fajar.hidayat@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
    ],
  },
  {
    id: "dept-2",
    name: "Operasional",
    code: "DPT-OPS",
    status: "Aktif",
    pic: "Budi Santoso",
    description: "Mengelola kelancaran operasional harian sekolah, fasilitas gedung, dan logistik umum.",
    totalBudget: 360000000,
    usedBudget: 120000000,
    year: 2026,
    updatedAt: "10 Oktober 2026",
    updatedBy: "Andi Pratama",
    members: [
      {
        id: "mem-5",
        name: "Budi Santoso",
        email: "budi.santoso@nusantara.co.id",
        role: "Penanggung jawab",
        status: "Aktif",
      },
      {
        id: "mem-6",
        name: "Agus Prasetyo",
        email: "agus.prasetyo@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
      {
        id: "mem-7",
        name: "Dewi Lestari",
        email: "dewi.lestari@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
      {
        id: "mem-8",
        name: "Hendra Wijaya",
        email: "hendra.wijaya@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
      {
        id: "mem-9",
        name: "Rina Kusuma",
        email: "rina.kusuma@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
      {
        id: "mem-10",
        name: "Wahyu Setiawan",
        email: "wahyu.setiawan@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
    ],
  },
  {
    id: "dept-3",
    name: "Teknologi",
    code: "DPT-IT",
    status: "Aktif",
    pic: "Ahmad Fauzi",
    description: "Pengembangan dan pemeliharaan infrastruktur jaringan, server, lab komputer, dan sistem aplikasi sekolah.",
    totalBudget: 300000000,
    usedBudget: 95000000,
    year: 2026,
    updatedAt: "8 Oktober 2026",
    updatedBy: "Andi Pratama",
    members: [
      {
        id: "mem-11",
        name: "Ahmad Fauzi",
        email: "ahmad.fauzi@nusantara.co.id",
        role: "Penanggung jawab",
        status: "Aktif",
      },
      {
        id: "mem-12",
        name: "Bambang Pamungkas",
        email: "bambang.p@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
      {
        id: "mem-13",
        name: "Cahyo Utomo",
        email: "cahyo.u@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
      {
        id: "mem-14",
        name: "Danang Saputra",
        email: "danang.s@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
      {
        id: "mem-15",
        name: "Eko Prasetya",
        email: "eko.p@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
    ],
  },
  {
    id: "dept-4",
    name: "Keuangan",
    code: "DPT-FIN",
    status: "Aktif",
    pic: "Siti Rahmawati",
    description: "Pengelolaan pembukuan keuangan, kas, permohonan dana (PPD), dan pelaporan audit berkala.",
    totalBudget: 120000000,
    usedBudget: 45000000,
    year: 2026,
    updatedAt: "5 Oktober 2026",
    updatedBy: "Andi Pratama",
    members: [
      {
        id: "mem-16",
        name: "Siti Rahmawati",
        email: "siti.rahma@nusantara.co.id",
        role: "Penanggung jawab",
        status: "Aktif",
      },
      {
        id: "mem-17",
        name: "Fitri Handayani",
        email: "fitri.h@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
      {
        id: "mem-18",
        name: "Gilang Ramadhan",
        email: "gilang.r@nusantara.co.id",
        role: "Anggota",
        status: "Aktif",
      },
    ],
  },
  {
    id: "dept-5",
    name: "Hukum",
    code: "DPT-LGL",
    status: "Nonaktif",
    pic: "-",
    description: "Konsultasi hukum perizinan institusi pendidikan dan peninjauan kontrak kerjasama institusi.",
    totalBudget: 0,
    usedBudget: 0,
    year: 2026,
    updatedAt: "1 Oktober 2026",
    updatedBy: "Andi Pratama",
    members: [],
  },
];

function formatRupiah(amount: number) {
  if (amount === 0) return "Rp0";
  return `Rp${amount.toLocaleString("id-ID")}`;
}

export function DepartmentView() {
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [selectedDeptId, setSelectedDeptId] = useState<string>("dept-1");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("Semua");
  const [yearFilter, setYearFilter] = useState<string>("2026");
  const [memberSearch, setMemberSearch] = useState<string>("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("Semua");

  // Modals
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [isEditDeptOpen, setIsEditDeptOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isAdjustBudgetOpen, setIsAdjustBudgetOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  // Active Department
  const activeDept = useMemo(() => {
    return departments.find((d) => d.id === selectedDeptId) || departments[0];
  }, [departments, selectedDeptId]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalCount = departments.length;
    const activeCount = departments.filter((d) => d.status === "Aktif").length;
    const totalMembers = departments.reduce((acc, d) => acc + d.members.length, 0);
    const totalAllBudget = departments.reduce((acc, d) => acc + d.totalBudget, 0);

    return { totalCount, activeCount, totalMembers, totalAllBudget };
  }, [departments]);

  // Filtered Departments
  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      const matchSearch =
        dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus =
        statusFilter === "Semua" || dept.status === statusFilter;
      const matchYear =
        yearFilter === "Semua" || dept.year.toString() === yearFilter;
      return matchSearch && matchStatus && matchYear;
    });
  }, [departments, searchQuery, statusFilter, yearFilter]);

  // Filtered Members in Active Department
  const filteredMembers = useMemo(() => {
    if (!activeDept) return [];
    return activeDept.members.filter((m) => {
      const matchQuery =
        m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase());
      const matchRole =
        memberRoleFilter === "Semua" || m.role === memberRoleFilter;
      return matchQuery && matchRole;
    });
  }, [activeDept, memberSearch, memberRoleFilter]);

  // Percentage of budget used
  const budgetPercentage = useMemo(() => {
    if (!activeDept || activeDept.totalBudget === 0) return 0;
    return Math.min(100, Math.round((activeDept.usedBudget / activeDept.totalBudget) * 100));
  }, [activeDept]);

  const remainingBudget = useMemo(() => {
    if (!activeDept) return 0;
    return Math.max(0, activeDept.totalBudget - activeDept.usedBudget);
  }, [activeDept]);

  // Triwulan (Quarter) Budget
  const quarterlyBudget = useMemo(() => {
    if (!activeDept || activeDept.totalBudget === 0) return 0;
    return Math.round(activeDept.totalBudget / 4);
  }, [activeDept]);

  // Actions
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
    setFeedback(`Departemen ${newDept.name} berhasil ditambahkan.`);
    setTimeout(() => setFeedback(null), 3000);
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
    setFeedback("Informasi departemen berhasil diperbarui.");
    setTimeout(() => setFeedback(null), 3000);
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
      setFeedback(`Departemen ${activeDept.name} telah dihapus.`);
      setTimeout(() => setFeedback(null), 3000);
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
    setFeedback("Anggaran departemen berhasil disesuaikan.");
    setTimeout(() => setFeedback(null), 3000);
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
    setFeedback(`${newMember.name} berhasil ditambahkan ke departemen.`);
    setTimeout(() => setFeedback(null), 3000);
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
      setFeedback(`${memberName} telah dikeluarkan dari departemen.`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[calc(100vh-4rem)] bg-background">
      {/* ============================================================== */}
      {/* LEFT PANEL: Master Departemen List                             */}
      {/* ============================================================== */}
      <aside className="w-full lg:w-88 border-r bg-muted/20 flex flex-col shrink-0">
        {/* Header */}
        <div className="p-5 border-b space-y-3.5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Departemen</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kelola data, anggaran, dan anggota.
            </p>
          </div>

          <Button
            onClick={handleOpenAddDept}
            variant="outline"
            className="w-full justify-center gap-1.5 text-xs font-semibold h-9"
          >
            <PlusIcon className="size-3.5" />
            + Tambah departemen
          </Button>

          {/* Search */}
          <div className="space-y-1">
            <label htmlFor="dept-search" className="text-xs font-medium text-foreground">Cari departemen</label>
            <Input
              id="dept-search"
              placeholder="Cari nama atau kode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 text-xs bg-background"
            />
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <label htmlFor="dept-status-filter" className="text-[11px] font-medium text-muted-foreground">Status</label>
              <select
                id="dept-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none"
              >
                <option value="Semua">Semua</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="dept-year-filter" className="text-[11px] font-medium text-muted-foreground">Tahun anggaran</label>
              <select
                id="dept-year-filter"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="Semua">Semua</option>
              </select>
            </div>
          </div>

          {/* Summary Label */}
          <div className="text-[11px] text-muted-foreground pt-1">
            {summaryMetrics.totalCount} departemen · {summaryMetrics.activeCount} aktif · {summaryMetrics.totalMembers} anggota
          </div>
        </div>

        {/* Department List */}
        <div className="flex-1 overflow-y-auto divide-y divide-border/60">
          {filteredDepartments.map((dept) => {
            const isSelected = dept.id === activeDept?.id;
            return (
              <div
                key={dept.id}
                onClick={() => setSelectedDeptId(dept.id)}
                className={`p-4 transition-colors cursor-pointer relative ${
                  isSelected
                    ? "bg-accent/80 border-l-4 border-l-primary text-accent-foreground"
                    : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm leading-tight text-foreground">
                    {dept.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 h-4 border ${
                      dept.status === "Aktif"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {dept.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>{dept.code}</span>
                  <span>{dept.members.length} anggota</span>
                </div>

                <div className="flex items-center justify-between mt-2 pt-1 text-xs">
                  <span className="font-semibold text-foreground">
                    {dept.totalBudget > 0 ? formatRupiah(dept.totalBudget) : "Belum diatur"}
                  </span>
                  <span
                    className={`text-xs ${
                      isSelected ? "text-muted-foreground font-medium" : "text-primary hover:underline"
                    }`}
                  >
                    {isSelected ? "Dipilih" : "Lihat detail →"}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredDepartments.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Tidak ada departemen yang sesuai dengan filter.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t text-xs text-muted-foreground bg-muted/10 space-y-0.5">
          <div>Menampilkan 1–{filteredDepartments.length} dari {departments.length} departemen</div>
          <div className="font-bold text-foreground">
            Total anggaran: {formatRupiah(summaryMetrics.totalAllBudget)}
          </div>
        </div>
      </aside>

      {/* ============================================================== */}
      {/* RIGHT PANEL: Detail Departemen                                 */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-background">
        {activeDept ? (
          <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
            {/* Top Breadcrumb & Actions */}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenEditDept}
                    className="gap-1.5 text-xs h-8"
                  >
                    <PencilSimpleIcon className="size-3.5" />
                    Edit departemen
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteDept}
                    className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-8"
                  >
                    Hapus
                  </Button>
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

            {/* ========================================================== */}
            {/* CARD 1: Informasi departemen                               */}
            {/* ========================================================== */}
            <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
              <h2 className="font-semibold text-sm">Informasi departemen</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Kode departemen</span>
                  <p className="font-semibold text-sm text-foreground">{activeDept.code}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Penanggung jawab</span>
                  <p className="font-semibold text-sm text-foreground">{activeDept.pic}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Jumlah anggota</span>
                  <p className="font-semibold text-sm text-foreground">
                    {activeDept.members.length} pengguna
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t space-y-1">
                <span className="text-xs text-muted-foreground">Deskripsi</span>
                <p className="text-xs text-foreground leading-relaxed">
                  {activeDept.description || "-"}
                </p>
              </div>
            </div>

            {/* ========================================================== */}
            {/* CARD 2: Anggaran departemen                                */}
            {/* ========================================================== */}
            <div className="rounded-lg border bg-card p-5 space-y-5 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">Anggaran departemen</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-normal">
                    Tahun {activeDept.year}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAdjustBudget}
                    className="gap-1.5 text-xs h-7"
                  >
                    Atur anggaran
                  </Button>
                </div>
              </div>

              {/* 3 Metric Boxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/40 border">
                  <div className="text-xs text-muted-foreground">Total anggaran</div>
                  <div className="text-xl lg:text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">
                    {formatRupiah(activeDept.totalBudget)}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/40 border">
                  <div className="text-xs text-muted-foreground">Terpakai</div>
                  <div className="text-xl lg:text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">
                    {formatRupiah(activeDept.usedBudget)}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-muted/40 border">
                  <div className="text-xs text-muted-foreground">Sisa anggaran</div>
                  <div className="text-xl lg:text-2xl font-bold tracking-tight text-foreground mt-1 font-mono">
                    {formatRupiah(remainingBudget)}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Pemakaian {budgetPercentage}% dari total anggaran</span>
                  <span>1 Jan – 31 Des {activeDept.year}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-foreground transition-all duration-500 rounded-full"
                    style={{ width: `${budgetPercentage}%` }}
                  />
                </div>
              </div>

              {/* Quarterly Breakdown */}
              <div className="text-[11px] text-muted-foreground border-t pt-3">
                Alokasi triwulan: Q1 {formatRupiah(quarterlyBudget)} · Q2 {formatRupiah(quarterlyBudget)} · Q3 {formatRupiah(quarterlyBudget)} · Q4 {formatRupiah(quarterlyBudget)}
              </div>
            </div>

            {/* ========================================================== */}
            {/* CARD 3: Anggota departemen                                 */}
            {/* ========================================================== */}
            <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">Anggota departemen</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-normal">
                    {activeDept.members.length} anggota
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddMemberOpen(true)}
                    className="gap-1.5 text-xs h-7 font-medium"
                  >
                    <PlusIcon className="size-3.5" />
                    + Tambah anggota
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="relative flex-1 w-full">
                  <Input
                    placeholder="Cari nama atau email..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>

                <select
                  value={memberRoleFilter}
                  onChange={(e) => setMemberRoleFilter(e.target.value)}
                  className="h-8 px-2 rounded-md border border-input bg-background text-xs w-full sm:w-36 focus:outline-none"
                >
                  <option value="Semua">Semua peran</option>
                  <option value="Penanggung jawab">Penanggung jawab</option>
                  <option value="Anggota">Anggota</option>
                </select>
              </div>

              {/* Member Table */}
              <div className="overflow-x-auto rounded-md border border-border/80">
                <table className="w-full caption-bottom text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground">
                      <th className="p-3 text-left font-medium">Pengguna</th>
                      <th className="p-3 text-left font-medium">Peran</th>
                      <th className="p-3 text-left font-medium">Status</th>
                      <th className="p-3 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-foreground">{member.name}</div>
                          <div className="text-muted-foreground text-[11px]">{member.email}</div>
                        </td>
                        <td className="p-3 text-muted-foreground font-medium">
                          {member.role}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1.5 text-foreground font-medium">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {member.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            className="h-7 text-xs px-2.5 hover:bg-destructive/10 hover:text-destructive"
                          >
                            Keluarkan
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          Belum ada anggota yang terdaftar di departemen ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-muted-foreground">
                Mengeluarkan anggota hanya menghapus keanggotaan departemen, bukan akun pengguna.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Pilih departemen di sebelah kiri untuk melihat detail.
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: Tambah Departemen                                       */}
      {/* ============================================================== */}
      {isAddDeptOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-base">Tambah Departemen Baru</h3>
              <button
                onClick={() => setIsAddDeptOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewDept} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Nama Departemen</label>
                <Input
                  required
                  placeholder="Contoh: Kurikulum & Akademik"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Kode Departemen</label>
                  <Input
                    required
                    placeholder="DPT-AKD"
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Status</label>
                  <select
                    value={deptForm.status}
                    onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value as any })}
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Penanggung Jawab (PIC)</label>
                <Input
                  placeholder="Nama pimpinan departemen..."
                  value={deptForm.pic}
                  onChange={(e) => setDeptForm({ ...deptForm, pic: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Alokasi Anggaran Tahunan (Rp)</label>
                <Input
                  type="number"
                  placeholder="150000000"
                  value={deptForm.totalBudget}
                  onChange={(e) => setDeptForm({ ...deptForm, totalBudget: Number(e.target.value) })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Deskripsi</label>
                <Textarea
                  placeholder="Tuliskan tugas dan lingkup kerja departemen..."
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddDeptOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm">
                  Simpan Departemen
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: Edit Departemen                                         */}
      {/* ============================================================== */}
      {isEditDeptOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-base">Edit Departemen</h3>
              <button
                onClick={() => setIsEditDeptOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDept} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Nama Departemen</label>
                <Input
                  required
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Kode</label>
                  <Input
                    required
                    value={deptForm.code}
                    onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Status</label>
                  <select
                    value={deptForm.status}
                    onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value as any })}
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Penanggung Jawab (PIC)</label>
                <Input
                  value={deptForm.pic}
                  onChange={(e) => setDeptForm({ ...deptForm, pic: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Deskripsi</label>
                <Textarea
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditDeptOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm">
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: Atur Anggaran                                           */}
      {/* ============================================================== */}
      {isAdjustBudgetOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-base">Atur Anggaran {activeDept?.name}</h3>
              <button
                onClick={() => setIsAdjustBudgetOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustBudget} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Total Anggaran (Rp)</label>
                <Input
                  type="number"
                  required
                  value={budgetForm}
                  onChange={(e) => setBudgetForm(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <p className="text-[11px] text-muted-foreground">
                Perubahan alokasi anggaran akan langsung tercatat untuk tahun buku {activeDept?.year}.
              </p>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdjustBudgetOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm">
                  Perbarui Anggaran
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: Tambah Anggota                                          */}
      {/* ============================================================== */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-base">Tambah Anggota Departemen</h3>
              <button
                onClick={() => setIsAddMemberOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Nama Pengguna</label>
                <Input
                  required
                  placeholder="Nama staf / guru..."
                  value={memberForm.name}
                  onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Email</label>
                <Input
                  type="email"
                  required
                  placeholder="staf@smktibazma.sch.id"
                  value={memberForm.email}
                  onChange={(e) => setMemberForm({ ...memberForm, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Peran</label>
                <select
                  value={memberForm.role}
                  onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as any })}
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                >
                  <option value="Anggota">Anggota</option>
                  <option value="Penanggung jawab">Penanggung jawab</option>
                </select>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddMemberOpen(false)}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm">
                  Tambahkan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
