"use client";

import { FormEvent, useState } from "react";
import { UserRound } from "lucide-react";
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
import { CHANNEL_OPTIONS } from "@/types/contracts";

export default function StmxCreatorContractPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    applicantCompany: "",
    creatorName: "",
    creatorSnsUrl: "",
    creatorChannelType: "instagram",
    creatorFollowers: "",
    proposedStartDate: "",
    proposedEndDate: "",
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
          flowType: "stmx_creator",
          applicantName: form.applicantName,
          applicantEmail: form.applicantEmail,
          applicantPhone: form.applicantPhone || null,
          applicantCompany: form.applicantCompany || null,
          creatorName: form.creatorName,
          creatorSnsUrl: form.creatorSnsUrl || null,
          creatorChannelType: form.creatorChannelType || null,
          creatorFollowers: form.creatorFollowers || null,
          proposedStartDate: form.proposedStartDate || null,
          proposedEndDate: form.proposedEndDate || null,
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
        creatorName: "",
        creatorSnsUrl: "",
        creatorChannelType: "instagram",
        creatorFollowers: "",
        proposedStartDate: "",
        proposedEndDate: "",
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
      title="STMX ↔ 크리에이터 계약 신청"
      description="스티믹스 플랫폼이 크리에이터와 계약할 때 사용하는 신청서입니다."
      icon={UserRound}
      badge="플랫폼–크리에이터"
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-10">
        <FormSection title="신청자 정보" description="작성자 / STMX 담당자">
          <Field label="이름" required>
            <TextInput required value={form.applicantName} onChange={set("applicantName")} placeholder="김스티" disabled={submitting} />
          </Field>
          <Field label="이메일" required>
            <TextInput required type="email" value={form.applicantEmail} onChange={set("applicantEmail")} placeholder="partner@stmx.co" disabled={submitting} />
          </Field>
          <Field label="연락처">
            <TextInput value={form.applicantPhone} onChange={set("applicantPhone")} placeholder="010-0000-0000" disabled={submitting} />
          </Field>
          <Field label="소속 / 팀">
            <TextInput value={form.applicantCompany} onChange={set("applicantCompany")} placeholder="STMX Partnerships" disabled={submitting} />
          </Field>
        </FormSection>

        <FormSection title="크리에이터 정보">
          <Field label="크리에이터명 / 닉네임" required>
            <TextInput required value={form.creatorName} onChange={set("creatorName")} placeholder="스타일메이커" disabled={submitting} />
          </Field>
          <Field label="주요 채널">
            <SelectInput value={form.creatorChannelType} onChange={set("creatorChannelType")} disabled={submitting}>
              {CHANNEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="SNS / 채널 URL" className="sm:col-span-2">
            <TextInput value={form.creatorSnsUrl} onChange={set("creatorSnsUrl")} placeholder="https://instagram.com/..." disabled={submitting} />
          </Field>
          <Field label="팔로워 규모">
            <TextInput value={form.creatorFollowers} onChange={set("creatorFollowers")} placeholder="예: 12만" disabled={submitting} />
          </Field>
        </FormSection>

        <FormSection title="계약 / 협업 내용">
          <Field label="희망 시작일">
            <TextInput type="date" value={form.proposedStartDate} onChange={set("proposedStartDate")} disabled={submitting} />
          </Field>
          <Field label="희망 종료일">
            <TextInput type="date" value={form.proposedEndDate} onChange={set("proposedEndDate")} disabled={submitting} />
          </Field>
          <Field label="협업 목적 / 내용" className="sm:col-span-2">
            <TextArea value={form.campaignGoal} onChange={set("campaignGoal")} placeholder="예: 시즌 룩북 콘텐츠 제작, 제품 착용 Loox 게시 등" disabled={submitting} />
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
