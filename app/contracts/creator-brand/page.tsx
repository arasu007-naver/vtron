"use client";

import { FormEvent, useState } from "react";
import { Handshake } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import ContractFormShell from "@/components/contracts/ContractFormShell";
import NotifyRecipientsEditor from "@/components/contracts/NotifyRecipientsEditor";
import {
  Field,
  FormSection,
  SelectInput,
  SubmitBar,
  TextArea,
  TextInput,
} from "@/components/contracts/FormFields";
import {
  BRAND_CATEGORY_OPTIONS,
  BUDGET_OPTIONS,
  CHANNEL_OPTIONS,
  type NotifyRecipientInput,
} from "@/types/contracts";

export default function CreatorBrandConnectPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notifyRecipients, setNotifyRecipients] = useState<NotifyRecipientInput[]>([]);

  const [form, setForm] = useState({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    applicantCompany: "",
    creatorName: "",
    creatorSnsUrl: "",
    creatorChannelType: "instagram",
    creatorFollowers: "",
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
    if (notifyRecipients.length === 0) {
      setError("알림 수신자를 1명 이상 지정해 주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authFetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowType: "creator_brand",
          applicantName: form.applicantName,
          applicantEmail: form.applicantEmail,
          applicantPhone: form.applicantPhone || null,
          applicantCompany: form.applicantCompany || null,
          creatorName: form.creatorName,
          creatorSnsUrl: form.creatorSnsUrl || null,
          creatorChannelType: form.creatorChannelType || null,
          creatorFollowers: form.creatorFollowers || null,
          brandName: form.brandName,
          brandWebsite: form.brandWebsite || null,
          brandCategory: form.brandCategory || null,
          brandContactName: form.brandContactName || null,
          proposedStartDate: form.proposedStartDate || null,
          proposedEndDate: form.proposedEndDate || null,
          budgetRange: form.budgetRange || null,
          campaignGoal: form.campaignGoal || null,
          notes: form.notes || null,
          notifyRecipients,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      const recipCount = data.application?.recipients?.length ?? notifyRecipients.length;
      setSuccess(
        `직접 연결 신청이 접수되었습니다. 알림 대상 ${recipCount}명이 저장·디렉터리에 유지되었습니다. (ID: ${data.application?.id?.slice(0, 8)}…)`
      );
      setForm({
        applicantName: "",
        applicantEmail: "",
        applicantPhone: "",
        applicantCompany: "",
        creatorName: "",
        creatorSnsUrl: "",
        creatorChannelType: "instagram",
        creatorFollowers: "",
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
      // 디렉터리는 유지. 이번 신청 첨부만 비움
      setNotifyRecipients([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ContractFormShell
      title="크리에이터 ↔ 브랜드 직접 연결"
      description="크리에이터와 브랜드가 STMX를 통해 직접 연결될 때 쓰는 신청서입니다. 제출 시 알림 수신자 목록을 함께 저장·유지합니다."
      icon={Handshake}
      badge="직접 연결 + 알림"
    >
      <form onSubmit={onSubmit} className="space-y-4 pb-10">
        <FormSection title="신청자 정보">
          <Field label="이름" required>
            <TextInput required value={form.applicantName} onChange={set("applicantName")} placeholder="김연결" disabled={submitting} />
          </Field>
          <Field label="이메일" required>
            <TextInput required type="email" value={form.applicantEmail} onChange={set("applicantEmail")} placeholder="you@example.com" disabled={submitting} />
          </Field>
          <Field label="연락처">
            <TextInput value={form.applicantPhone} onChange={set("applicantPhone")} placeholder="010-0000-0000" disabled={submitting} />
          </Field>
          <Field label="소속">
            <TextInput value={form.applicantCompany} onChange={set("applicantCompany")} placeholder="에이전시 / 브랜드 / 개인" disabled={submitting} />
          </Field>
        </FormSection>

        <FormSection title="크리에이터">
          <Field label="크리에이터명" required>
            <TextInput required value={form.creatorName} onChange={set("creatorName")} placeholder="스타일메이커" disabled={submitting} />
          </Field>
          <Field label="주요 채널">
            <SelectInput value={form.creatorChannelType} onChange={set("creatorChannelType")} disabled={submitting}>
              {CHANNEL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="SNS URL" className="sm:col-span-2">
            <TextInput value={form.creatorSnsUrl} onChange={set("creatorSnsUrl")} placeholder="https://..." disabled={submitting} />
          </Field>
          <Field label="팔로워 규모">
            <TextInput value={form.creatorFollowers} onChange={set("creatorFollowers")} placeholder="예: 8만" disabled={submitting} />
          </Field>
        </FormSection>

        <FormSection title="브랜드">
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
          <Field label="브랜드 담당자">
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

        <FormSection title="연결 / 캠페인">
          <Field label="희망 시작일">
            <TextInput type="date" value={form.proposedStartDate} onChange={set("proposedStartDate")} disabled={submitting} />
          </Field>
          <Field label="희망 종료일">
            <TextInput type="date" value={form.proposedEndDate} onChange={set("proposedEndDate")} disabled={submitting} />
          </Field>
          <Field label="연결 목적 / 캠페인 요약" className="sm:col-span-2">
            <TextArea value={form.campaignGoal} onChange={set("campaignGoal")} placeholder="양측이 합의한 협업 내용 요약" disabled={submitting} />
          </Field>
          <Field label="비고" className="sm:col-span-2">
            <TextArea value={form.notes} onChange={set("notes")} placeholder="추가 메모" disabled={submitting} />
          </Field>
        </FormSection>

        <NotifyRecipientsEditor
          value={notifyRecipients}
          onChange={setNotifyRecipients}
          disabled={submitting}
        />

        <SubmitBar
          submitting={submitting}
          success={success}
          error={error}
          submitLabel="직접 연결 신청 제출"
        />
      </form>
    </ContractFormShell>
  );
}
