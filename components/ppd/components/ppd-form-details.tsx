"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type PpdFormDetailsProps = {
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  deptId: string;
  onDeptIdChange: (v: string) => void;
  departments: Array<{ id: string; name: string }>;
  submissionType: string;
  onSubmissionTypeChange: (v: string) => void;
  paymentType: string;
  onPaymentTypeChange: (v: string) => void;
  bank: string;
  onBankChange: (v: string) => void;
  accountNo: string;
  onAccountNoChange: (v: string) => void;
  limitFund: string;
  onLimitFundChange: (v: string) => void;
};

export function PpdFormDetails({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  deptId,
  onDeptIdChange,
  departments,
  submissionType,
  onSubmissionTypeChange,
  paymentType,
  onPaymentTypeChange,
  bank,
  onBankChange,
  accountNo,
  onAccountNoChange,
  limitFund,
  onLimitFundChange,
}: PpdFormDetailsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
        <h3 className="font-semibold text-sm">Form detail submission</h3>
        <div className="space-y-1.5">
          <label htmlFor="p-title" className="text-xs font-medium text-muted-foreground">Title</label>
          <Input id="p-title" value={title} onChange={(e) => onTitleChange(e.target.value)} className="text-sm" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="p-desc" className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea id="p-desc" value={description} onChange={(e) => onDescriptionChange(e.target.value)} rows={3} className="text-sm resize-none" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="p-dept" className="text-xs font-medium text-muted-foreground">Departemen</label>
          <Select value={deptId} onValueChange={(v) => v && onDeptIdChange(v)}>
            <SelectTrigger id="p-dept" className="h-10 text-sm">
              <SelectValue placeholder="Pilih departemen" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="p-sub" className="text-xs font-medium text-muted-foreground">Submission Type</label>
          <select id="p-sub" value={submissionType} onChange={(e) => onSubmissionTypeChange(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none">
            <option value="">Select submission type</option>
            <option value="Uang Muka">Uang Muka (Advance)</option>
            <option value="Reimbursement">Reimbursement (Penggantian)</option>
            <option value="Pembayaran Vendor">Pembayaran Langsung Vendor</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4 shadow-xs">
        <h3 className="font-semibold text-sm">Form payment method</h3>
        <div className="space-y-1.5">
          <label htmlFor="p-pay" className="text-xs font-medium text-muted-foreground">Type</label>
          <select id="p-pay" value={paymentType} onChange={(e) => onPaymentTypeChange(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none">
            <option value="Transfer">Transfer Bank</option>
            <option value="Tunai / Kas">Tunai / Kas Sekolah</option>
            <option value="Giro">Cek / Bilyet Giro</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="p-bank" className="text-xs font-medium text-muted-foreground">Bank</label>
          <select id="p-bank" value={bank} onChange={(e) => onBankChange(e.target.value)} className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none">
            <option value="">Select Bank</option>
            <option value="Bank Syariah Indonesia (BSI)">Bank Syariah Indonesia (BSI)</option>
            <option value="Bank Mandiri">Bank Mandiri</option>
            <option value="Bank BCA">Bank Central Asia (BCA)</option>
            <option value="Bank BRI">Bank Rakyat Indonesia (BRI)</option>
            <option value="Bank BNI">Bank Negara Indonesia (BNI)</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="p-acc" className="text-xs font-medium text-muted-foreground">Account No</label>
          <Input id="p-acc" value={accountNo} onChange={(e) => onAccountNoChange(e.target.value)} className="text-sm font-mono" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="p-limit" className="text-xs font-medium text-muted-foreground">Total limit fund</label>
          <Input id="p-limit" value={limitFund} onChange={(e) => onLimitFundChange(e.target.value)} className="text-sm font-medium" />
        </div>
      </div>
    </div>
  );
}
