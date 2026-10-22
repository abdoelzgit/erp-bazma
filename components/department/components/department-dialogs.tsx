"use client";

import { XIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ROLE_LABELS } from "@/lib/roles";
import type { DepartmentUserOption } from "../department-view.types";

type DepartmentForm = {
  name: string;
  code: string;
  pic: string;
  description: string;
  status: "Aktif" | "Nonaktif";
};

export type DepartmentDialogsProps = {
  // Add Dept
  isAddOpen: boolean;
  onCloseAdd: () => void;
  onSubmitAdd: (e: React.FormEvent) => void;
  deptForm: DepartmentForm;
  onDeptFormChange: (form: DepartmentForm) => void;

  // Edit Dept
  isEditOpen: boolean;
  onCloseEdit: () => void;
  onSubmitEdit: (e: React.FormEvent) => void;

  // Add Member
  isMemberOpen: boolean;
  onCloseMember: () => void;
  onSubmitMember: (e: React.FormEvent) => void;
  memberForm: {
    userId: string;
  };
  onMemberFormChange: (form: { userId: string }) => void;
  memberUsers: DepartmentUserOption[];
};

function DepartmentDialog({
  open,
  onClose,
  title,
  size = "md",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: "sm" | "md";
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`max-h-[calc(100svh-2rem)] overflow-y-auto overscroll-contain rounded-lg bg-card p-6 shadow-xl ${size === "sm" ? "sm:max-w-sm" : "sm:max-w-md"}`}
      >
        <DialogHeader className="flex-row items-center justify-between border-b pb-3">
          <DialogTitle className="text-base font-semibold normal-case tracking-normal">
            {title}
          </DialogTitle>
          <DialogClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Tutup dialog: ${title}`}
              />
            }
          >
            <XIcon aria-hidden="true" />
          </DialogClose>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

export function DepartmentDialogs({
  isAddOpen,
  onCloseAdd,
  onSubmitAdd,
  deptForm,
  onDeptFormChange,
  isEditOpen,
  onCloseEdit,
  onSubmitEdit,
  isMemberOpen,
  onCloseMember,
  onSubmitMember,
  memberForm,
  onMemberFormChange,
  memberUsers,
}: DepartmentDialogsProps) {
  return (
    <>
      <DepartmentDialog open={isAddOpen} onClose={onCloseAdd} title="Tambah departemen">
            <form onSubmit={onSubmitAdd} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label htmlFor="dept-add-name" className="font-medium text-muted-foreground">Nama departemen</label>
                <Input
                  id="dept-add-name"
                  required
                  placeholder="Contoh: Kurikulum & Akademik"
                  value={deptForm.name}
                  onChange={(e) => onDeptFormChange({ ...deptForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="dept-add-code" className="font-medium text-muted-foreground">Kode departemen</label>
                  <Input
                    id="dept-add-code"
                    required
                    placeholder="DPT-AKD"
                    value={deptForm.code}
                    onChange={(e) => onDeptFormChange({ ...deptForm, code: e.target.value })}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="dept-add-status" className="font-medium text-muted-foreground">Status</label>
                  <select
                    id="dept-add-status"
                    value={deptForm.status}
                    onChange={(e) => onDeptFormChange({ ...deptForm, status: e.target.value as DepartmentForm["status"] })}
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="dept-add-pic" className="font-medium text-muted-foreground">Penanggung jawab (PIC)</label>
                <Input
                  id="dept-add-pic"
                  placeholder="Nama pimpinan departemen..."
                  value={deptForm.pic}
                  onChange={(e) => onDeptFormChange({ ...deptForm, pic: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="dept-add-description" className="font-medium text-muted-foreground">Deskripsi</label>
                <Textarea
                  id="dept-add-description"
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
      </DepartmentDialog>

      <DepartmentDialog open={isEditOpen} onClose={onCloseEdit} title="Edit departemen">
            <form onSubmit={onSubmitEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label htmlFor="dept-edit-name" className="font-medium text-muted-foreground">Nama departemen</label>
                <Input
                  id="dept-edit-name"
                  required
                  value={deptForm.name}
                  onChange={(e) => onDeptFormChange({ ...deptForm, name: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="dept-edit-code" className="font-medium text-muted-foreground">Kode</label>
                  <Input
                    id="dept-edit-code"
                    required
                    value={deptForm.code}
                    onChange={(e) => onDeptFormChange({ ...deptForm, code: e.target.value })}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="dept-edit-status" className="font-medium text-muted-foreground">Status</label>
                  <select
                    id="dept-edit-status"
                    value={deptForm.status}
                    onChange={(e) => onDeptFormChange({ ...deptForm, status: e.target.value as DepartmentForm["status"] })}
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label htmlFor="dept-edit-pic" className="font-medium text-muted-foreground">Penanggung jawab (PIC)</label>
                <Input
                  id="dept-edit-pic"
                  value={deptForm.pic}
                  onChange={(e) => onDeptFormChange({ ...deptForm, pic: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="dept-edit-description" className="font-medium text-muted-foreground">Deskripsi</label>
                <Textarea
                  id="dept-edit-description"
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
      </DepartmentDialog>

      <DepartmentDialog open={isMemberOpen} onClose={onCloseMember} title="Tambah anggota departemen" size="sm">
            <form onSubmit={onSubmitMember} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label htmlFor="dept-member-user" className="font-medium text-muted-foreground">Pengguna</label>
                <select
                  id="dept-member-user"
                  required
                  value={memberForm.userId}
                  onChange={(e) => onMemberFormChange({ userId: e.target.value })}
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs"
                >
                  <option value="">Pilih pengguna dari tabel User</option>
                  {memberUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name || user.email} · {user.email} · {ROLE_LABELS[user.role]}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Role akun Kepala Bagian otomatis menjadi Penanggung jawab. Role akun lainnya menjadi Anggota.
                </p>
                {memberUsers.length === 0 && (
                  <p className="text-[10px] text-amber-700">Semua pengguna sudah menjadi anggota departemen ini atau belum ada pengguna terdaftar.</p>
                )}
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={onCloseMember}>Batal</Button>
                <Button type="submit" size="sm" disabled={memberUsers.length === 0 || !memberForm.userId}>Tambahkan</Button>
              </div>
            </form>
      </DepartmentDialog>
    </>
  );
}
