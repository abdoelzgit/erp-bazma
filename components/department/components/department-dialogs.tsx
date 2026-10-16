"use client";

import { XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type DepartmentDialogsProps = {
  // Add Dept
  isAddOpen: boolean;
  onCloseAdd: () => void;
  onSubmitAdd: (e: React.FormEvent) => void;
  deptForm: {
    name: string;
    code: string;
    pic: string;
    description: string;
    totalBudget: number;
    status: "Aktif" | "Nonaktif";
  };
  onDeptFormChange: (form: any) => void;

  // Edit Dept
  isEditOpen: boolean;
  onCloseEdit: () => void;
  onSubmitEdit: (e: React.FormEvent) => void;

  // Adjust Budget
  isBudgetOpen: boolean;
  onCloseBudget: () => void;
  onSubmitBudget: (e: React.FormEvent) => void;
  budgetVal: number;
  onBudgetValChange: (v: number) => void;
  activeDeptName?: string;
  activeDeptYear?: number;

  // Add Member
  isMemberOpen: boolean;
  onCloseMember: () => void;
  onSubmitMember: (e: React.FormEvent) => void;
  memberForm: {
    name: string;
    email: string;
    role: "Penanggung jawab" | "Anggota";
  };
  onMemberFormChange: (form: any) => void;
};

export function DepartmentDialogs({
  isAddOpen,
  onCloseAdd,
  onSubmitAdd,
  deptForm,
  onDeptFormChange,
  isEditOpen,
  onCloseEdit,
  onSubmitEdit,
  isBudgetOpen,
  onCloseBudget,
  onSubmitBudget,
  budgetVal,
  onBudgetValChange,
  activeDeptName,
  activeDeptYear,
  isMemberOpen,
  onCloseMember,
  onSubmitMember,
  memberForm,
  onMemberFormChange,
}: DepartmentDialogsProps) {
  return (
    <>
      {/* Add Dept Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-base">Tambah Departemen Baru</h3>
              <button onClick={onCloseAdd} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>
            <form onSubmit={onSubmitAdd} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Nama Departemen</label>
                <Input
                  required
                  placeholder="Contoh: Kurikulum & Akademik"
                  value={deptForm.name}
                  onChange={(e) => onDeptFormChange({ ...deptForm, name: e.target.value })}
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
                    onChange={(e) => onDeptFormChange({ ...deptForm, code: e.target.value })}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Status</label>
                  <select
                    value={deptForm.status}
                    onChange={(e) => onDeptFormChange({ ...deptForm, status: e.target.value as any })}
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
                  onChange={(e) => onDeptFormChange({ ...deptForm, pic: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Alokasi Anggaran Tahunan (Rp)</label>
                <Input
                  type="number"
                  placeholder="150000000"
                  value={deptForm.totalBudget}
                  onChange={(e) => onDeptFormChange({ ...deptForm, totalBudget: Number(e.target.value) })}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Deskripsi</label>
                <Textarea
                  placeholder="Tuliskan tugas dan lingkup kerja departemen..."
                  value={deptForm.description}
                  onChange={(e) => onDeptFormChange({ ...deptForm, description: e.target.value })}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onCloseAdd}>Batal</Button>
                <Button type="submit" size="sm">Simpan Departemen</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dept Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-base">Edit Departemen</h3>
              <button onClick={onCloseEdit} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>
            <form onSubmit={onSubmitEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Nama Departemen</label>
                <Input
                  required
                  value={deptForm.name}
                  onChange={(e) => onDeptFormChange({ ...deptForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Kode</label>
                  <Input
                    required
                    value={deptForm.code}
                    onChange={(e) => onDeptFormChange({ ...deptForm, code: e.target.value })}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground">Status</label>
                  <select
                    value={deptForm.status}
                    onChange={(e) => onDeptFormChange({ ...deptForm, status: e.target.value as any })}
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
                  onChange={(e) => onDeptFormChange({ ...deptForm, pic: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Deskripsi</label>
                <Textarea
                  value={deptForm.description}
                  onChange={(e) => onDeptFormChange({ ...deptForm, description: e.target.value })}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onCloseEdit}>Batal</Button>
                <Button type="submit" size="sm">Simpan Perubahan</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Budget Modal */}
      {isBudgetOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-base">Atur Anggaran {activeDeptName}</h3>
              <button onClick={onCloseBudget} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>
            <form onSubmit={onSubmitBudget} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Total Anggaran (Rp)</label>
                <Input
                  type="number"
                  required
                  value={budgetVal}
                  onChange={(e) => onBudgetValChange(Number(e.target.value))}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Perubahan alokasi anggaran akan langsung tercatat untuk tahun buku {activeDeptYear}.
              </p>
              <div className="pt-3 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onCloseBudget}>Batal</Button>
                <Button type="submit" size="sm">Perbarui Anggaran</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isMemberOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border rounded-lg max-w-sm w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-semibold text-base">Tambah Anggota Departemen</h3>
              <button onClick={onCloseMember} className="text-muted-foreground hover:text-foreground">
                <XIcon className="size-4" />
              </button>
            </div>
            <form onSubmit={onSubmitMember} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Nama Pengguna</label>
                <Input
                  required
                  placeholder="Nama staf / guru..."
                  value={memberForm.name}
                  onChange={(e) => onMemberFormChange({ ...memberForm, name: e.target.value })}
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
                  onChange={(e) => onMemberFormChange({ ...memberForm, email: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-muted-foreground">Peran</label>
                <select
                  value={memberForm.role}
                  onChange={(e) => onMemberFormChange({ ...memberForm, role: e.target.value as any })}
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                >
                  <option value="Anggota">Anggota</option>
                  <option value="Penanggung jawab">Penanggung jawab</option>
                </select>
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onCloseMember}>Batal</Button>
                <Button type="submit" size="sm">Tambahkan</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
