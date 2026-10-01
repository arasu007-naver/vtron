"use client";

import { FormEvent, useState } from "react";
import { Building2 } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import ContractFormShell from "@/components/contracts/ContractFormShell";
import {
  Field,
  FormSection,
  SelectInput,
  SubmitBar,
  TextArea,
  TextInput,
} from "@/components/contracts/FormFields";
import { BRAND_CATEGORY_OPTIONS, BUDGET_OPTIONS } from "@/types/contracts";

export default function StmxBrandContractPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    applicantCompany: "",
    brandName: "",
    brandWebsite: "",
    brandCategory: "fashion",
    brandContactName: "",
    proposedStartDate: "",
    proposedEndDate: "",
    budgetRange: "negotiate",
    campaignGoal: "",
    notes: "",
  });

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowType: "stmx_brand",
          applicantName: form.applicantName,
          applicantEmail: form.applicantEmail,
          applicantPhone: form.applicantPhone || null,
          applicantCompany: form.applicantCompany || null,
          brandName: form.brandName,
          brandWebsite: form.brandWebsite || null,
          brandCategory: form.brandCategory || null,
          brandContactName: form.brandContactName || null,
          proposedStartDate: form.proposedStartDate || null,
          proposedEndDate: form.proposedEndDate || null,
          budgetRange: form.budgetRange || null,
          campaignGoal: form.campaignGoal || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setSuccess(`신청이 접수되었습니다. (ID: ${data.application?.id?.slice(0, 8)}…)`);
      setForm({
        applicantName: "",
        applicantEmail: "",
        applicantPhone: "",
        applicantCompany: "",
        brandName: "",
        brandWebsite: "",
        brandCategory: "fashion",
        brandContactName: "",
        proposedStartDate: "",
        proposedEndDate: "",
        budgetRange: "negotiate",
        campaignGoal: "",
        notes: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ContractFormShell
      title="STMX ↔ 브랜드 계약 신청"
      description="스티믹스 플랫폼이 브랜드와 계약할 때 사용하는 신청서입니다."
      icon={Building2}
      badge="플랫폼–브랜드"
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-10">
        <FormSection title="신청자 정보" description="작성자 / STMX 또는 브랜드 담당">
          <Field label="이름" required>
            <TextInput required value={form.applicantName} onChange={set("applicantName")} placeholder="이담당" disabled={submitting} />
          </Field>
          <Field label="이메일" required>
            <TextInput required type="email" value={form.applicantEmail} onChange={set("applicantEmail")} placeholder="brand@example.com" disabled={submitting} />
          </Field>
          <Field label="연락처">
            <TextInput value={form.applicantPhone} onChange={set("applicantPhone")} placeholder="010-0000-0000" disabled={submitting} />
          </Field>
          <Field label="회사 / 팀">
            <TextInput value={form.applicantCompany} onChange={set("applicantCompany")} placeholder="OO 마케팅팀" disabled={submitting} />
          </Field>
        </FormSection>

        <FormSection title="브랜드 정보">
          <Field label="브랜드명" required>
            <TextInput required value={form.brandName} onChange={set("brandName")} placeholder="EXAMPLE BRAND" disabled={submitting} />
          </Field>
          <Field label="카테고리">
            <SelectInput value={form.brandCategory} onChange={set("brandCategory")} disabled={submitting}>
              {BRAND_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="웹사이트" className="sm:col-span-2">
            <TextInput value={form.brandWebsite} onChange={set("brandWebsite")} placeholder="https://..." disabled={submitting} />
          </Field>
          <Field label="브랜드 측 담당자명">
            <TextInput value={form.brandContactName} onChange={set("brandContactName")} placeholder="박매니저" disabled={submitting} />
          </Field>
          <Field label="예산대">
            <SelectInput value={form.budgetRange} onChange={set("budgetRange")} disabled={submitting}>
              {BUDGET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectInput>
          </Field>
        </FormSection>

        <FormSection title="캠페인 / 계약">
          <Field label="희망 시작일">
            <TextInput type="date" value={form.proposedStartDate} onChange={set("proposedStartDate")} disabled={submitting} />
          </Field>
          <Field label="희망 종료일">
            <TextInput type="date" value={form.proposedEndDate} onChange={set("proposedEndDate")} disabled={submitting} />
          </Field>
          <Field label="캠페인 목표" className="sm:col-span-2">
            <TextArea value={form.campaignGoal} onChange={set("campaignGoal")} placeholder="예: 신상품 인지 확대, 크리에이터 협업 콘텐츠 N건" disabled={submitting} />
          </Field>
          <Field label="비고" className="sm:col-span-2">
            <TextArea value={form.notes} onChange={set("notes")} placeholder="추가 요청사항" disabled={submitting} />
          </Field>
        </FormSection>

        <SubmitBar submitting={submitting} success={success} error={error} />
      </form>
    </ContractFormShell>
  );
}
