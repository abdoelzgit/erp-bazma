"use client";

import type { ReactNode } from "react";
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
  disabled?: boolean;
};

type Option = { value: string; label: string };

const SUBMISSION_TYPES: Option[] = [
  { value: "UANG_MUKA", label: "Uang Muka (Advance)" },
  { value: "PEMBAYARAN", label: "Pembayaran (Payment)" },
];

const PAYMENT_TYPES: Option[] = [
  { value: "Transfer", label: "Transfer Bank" },
  { value: "Tunai / Kas", label: "Tunai / Kas Sekolah" },
  { value: "Giro", label: "Cek / Bilyet Giro" },
];

const BANKS: Option[] = [
  { value: "Bank Syariah Indonesia (BSI)", label: "Bank Syariah Indonesia (BSI)" },
  { value: "Bank Mandiri", label: "Bank Mandiri" },
  { value: "Bank BCA", label: "Bank Central Asia (BCA)" },
  { value: "Bank BRI", label: "Bank Rakyat Indonesia (BRI)" },
  { value: "Bank BNI", label: "Bank Negara Indonesia (BNI)" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-4 shadow-xs sm:p-6">
      <h3 className="mb-4 border-b pb-3 text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  className,
  children,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`min-w-0 space-y-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function OptionSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(v) => v && onChange(v)}
      items={options}
    >
      <SelectTrigger id={id} className="h-10 w-full text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

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
  disabled = false,
}: PpdFormDetailsProps) {
  const deptOptions: Option[] = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <Section title="Detail pengajuan">
        <Field id="p-title" label="Judul" className="sm:col-span-2">
          <Input
            id="p-title"
            value={title}
            disabled={disabled}
            onChange={(e) => onTitleChange(e.target.value)}
            className="h-10 text-sm"
          />
        </Field>

        <Field id="p-desc" label="Deskripsi" className="sm:col-span-2">
          <Textarea
            id="p-desc"
            value={description}
            disabled={disabled}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            className="resize-none text-sm"
          />
        </Field>

        <Field id="p-dept" label="Departemen">
          <OptionSelect
            id="p-dept"
            value={deptId}
            onChange={onDeptIdChange}
            options={deptOptions}
            placeholder="Pilih departemen"
            disabled={disabled}
          />
        </Field>

        <Field id="p-sub" label="Jenis pengajuan">
          <OptionSelect
            id="p-sub"
            value={submissionType}
            onChange={onSubmissionTypeChange}
            options={SUBMISSION_TYPES}
            placeholder="Pilih jenis pengajuan"
            disabled={disabled}
          />
        </Field>
      </Section>

      <Section title="Metode pembayaran">
        <Field id="p-pay" label="Tipe" className="sm:col-span-2">
          <OptionSelect
            id="p-pay"
            value={paymentType}
            onChange={onPaymentTypeChange}
            options={PAYMENT_TYPES}
            placeholder="Pilih tipe pembayaran"
            disabled={disabled}
          />
        </Field>

        <Field id="p-bank" label="Bank" className="sm:col-span-2">
          <OptionSelect
            id="p-bank"
            value={bank}
            onChange={onBankChange}
            options={BANKS}
            placeholder="Pilih bank"
            disabled={disabled}
          />
        </Field>

        <Field id="p-acc" label="No. rekening">
          <Input
            id="p-acc"
            inputMode="numeric"
            value={accountNo}
            disabled={disabled}
            onChange={(e) => onAccountNoChange(e.target.value)}
            className="h-10 font-mono text-sm"
          />
        </Field>

        <Field id="p-limit" label="Jumlah Pengajuan">
          <Input
            id="p-limit"
            inputMode="numeric"
            value={limitFund}
            disabled={disabled || submissionType === "UANG_MUKA"}
            onChange={(e) => onLimitFundChange(e.target.value)}
            className="h-10 text-sm font-medium"
          />
          
        </Field>
      </Section>
    </div>
  );
}
