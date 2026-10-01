"use client";

import { cn } from "@/lib/utils";

export function Field({
  label,
  required,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-[13px] font-semibold text-[#101317]">
        {label}
        {required && <span className="text-[#E52E2E] ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[12px] text-[#8E96A2] m-0">{hint}</p>}
    </div>
  );
}

const controlClass =
  "w-full h-10 px-3 rounded-lg bg-white border border-[#E0E3E8] text-[14px] text-[#101317] outline-none focus:border-[#b68235] focus:ring-2 focus:ring-[rgba(182,130,53,0.2)] transition-all placeholder:text-[#A0A4A8] disabled:opacity-60";

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return <input {...props} className={cn(controlClass, props.className)} />;
}

export function TextArea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={cn(
        controlClass,
        "h-auto min-h-[96px] py-2.5 resize-y",
        props.className
      )}
    />
  );
}

export function SelectInput(
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
  return <select {...props} className={cn(controlClass, props.className)} />;
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5 space-y-4">
      <div>
        <h2 className="text-[15px] font-bold text-[#101317] m-0">{title}</h2>
        {description && (
          <p className="text-[12px] text-[#717680] mt-1 m-0">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

export function SubmitBar({
  submitting,
  success,
  error,
  submitLabel = "신청 제출",
}: {
  submitting: boolean;
  success: string | null;
  error: string | null;
  submitLabel?: string;
}) {
  return (
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-[#FFD0D0] bg-[#FFECEC] px-4 py-3 text-[13px] text-[#C42424]"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded-xl border border-[#C3EED3] bg-[#E6F8ED] px-4 py-3 text-[13px] text-[#0E8A42]"
        >
          {success}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primary w-full sm:w-auto px-6 py-3 rounded-xl text-[14px] font-semibold disabled:opacity-60"
      >
        {submitting ? "제출 중…" : submitLabel}
      </button>
    </div>
  );
}
