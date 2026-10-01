"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, UserPlus, RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/auth-client";
import type { NotifyDirectoryEntry, NotifyRecipientInput } from "@/types/contracts";
import { Field, TextInput, SelectInput } from "./FormFields";

const ROLE_OPTIONS = [
  { value: "ops", label: "운영" },
  { value: "legal", label: "법무/계약" },
  { value: "creator_manager", label: "크리에이터 매니저" },
  { value: "brand_manager", label: "브랜드 담당" },
  { value: "finance", label: "정산" },
  { value: "other", label: "기타" },
];

interface NotifyRecipientsEditorProps {
  value: NotifyRecipientInput[];
  onChange: (next: NotifyRecipientInput[]) => void;
  disabled?: boolean;
}

/**
 * 크리에이터↔브랜드 직접 연결용 알림 수신자 편집기.
 * - 상단: 유지 중인 마스터 디렉터리 (불러와 선택 / 비활성)
 * - 하단: 이번 신청에 첨부할 수신자 목록
 */
export default function NotifyRecipientsEditor({
  value,
  onChange,
  disabled,
}: NotifyRecipientsEditorProps) {
  const [directory, setDirectory] = useState<NotifyDirectoryEntry[]>([]);
  const [loadingDir, setLoadingDir] = useState(true);
  const [dirError, setDirError] = useState<string | null>(null);
  const [draft, setDraft] = useState<NotifyRecipientInput>({
    name: "",
    email: "",
    role: "ops",
    phone: "",
  });
  const [saving, setSaving] = useState(false);

  const loadDirectory = useCallback(async () => {
    setLoadingDir(true);
    setDirError(null);
    try {
      const res = await authFetch("/api/contracts/notify-directory?all=1");
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
      setDirectory(data.recipients || []);
    } catch (err) {
      setDirError(err instanceof Error ? err.message : "목록을 불러오지 못했습니다.");
      setDirectory([]);
    } finally {
      setLoadingDir(false);
    }
  }, []);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  const addFromDirectory = (entry: NotifyDirectoryEntry) => {
    if (value.some((v) => v.email.toLowerCase() === entry.email.toLowerCase())) return;
    onChange([
      ...value,
      {
        name: entry.name,
        email: entry.email,
        role: entry.role,
        phone: entry.phone,
        directoryId: entry.id,
      },
    ]);
  };

  const addDraft = async () => {
    const name = draft.name.trim();
    const email = draft.email.trim().toLowerCase();
    if (!name || !email) {
      alert("이름과 이메일을 입력하세요.");
      return;
    }
    if (value.some((v) => v.email.toLowerCase() === email)) {
      alert("이미 추가된 이메일입니다.");
      return;
    }

    setSaving(true);
    try {
      // 마스터 목록에도 바로 반영 (유지)
      const res = await authFetch("/api/contracts/notify-directory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          role: draft.role || null,
          phone: draft.phone || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "저장 실패");

      onChange([
        ...value,
        {
          name,
          email,
          role: draft.role || null,
          phone: draft.phone || null,
          directoryId: data.recipient?.id || null,
        },
      ]);
      setDraft({ name: "", email: "", role: "ops", phone: "" });
      await loadDirectory();
    } catch (err) {
      alert(err instanceof Error ? err.message : "수신자 추가에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const removeAt = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const deactivateDirectory = async (id: string) => {
    if (!confirm("이 수신자를 마스터 목록에서 비활성화할까요?")) return;
    try {
      const res = await authFetch(`/api/contracts/notify-directory?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "실패");
      await loadDirectory();
    } catch (err) {
      alert(err instanceof Error ? err.message : "비활성화에 실패했습니다.");
    }
  };

  const activeDir = directory.filter((d) => d.is_active);
  const inactiveDir = directory.filter((d) => !d.is_active);

  return (
    <section className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-[#101317] m-0 flex items-center gap-1.5">
            <UserPlus className="w-4 h-4 text-[#7A2CEE]" />
            알림 수신자 목록
          </h2>
          <p className="text-[12px] text-[#717680] mt-1 m-0">
            크리에이터↔브랜드 직접 연결 신청이 들어오면 알릴 사람입니다. 마스터 목록에
            저장·유지되며, 이번 신청에도 첨부됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={loadDirectory}
          disabled={loadingDir || disabled}
          className="px-3 py-1.5 h-9 rounded-lg bg-white border border-[#E0E3E8] hover:bg-[#F4F5F7] text-[13px] font-medium text-[#101317] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingDir ? "animate-spin" : ""}`} />
          새로고침
        </button>
      </div>

      {dirError && (
        <div className="rounded-xl border border-[#FFD0D0] bg-[#FFECEC] px-3 py-2 text-[12px] text-[#C42424]">
          {dirError}
        </div>
      )}

      {/* 마스터 디렉터리 */}
      <div>
        <h3 className="text-[13px] font-bold text-[#101317] mb-2">유지 중인 수신자 디렉터리</h3>
        {loadingDir ? (
          <p className="text-[12px] text-[#8E96A2]">불러오는 중…</p>
        ) : activeDir.length === 0 ? (
          <p className="text-[12px] text-[#8E96A2] italic">아직 등록된 수신자가 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {activeDir.map((entry) => {
              const already = value.some(
                (v) => v.email.toLowerCase() === entry.email.toLowerCase()
              );
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB]"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#111827] truncate">
                      {entry.name}
                      {entry.role && (
                        <span className="ml-1.5 text-[11px] font-medium text-[#7A2CEE]">
                          ({ROLE_OPTIONS.find((r) => r.value === entry.role)?.label || entry.role})
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[#6B7280] truncate">{entry.email}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={already || disabled}
                      onClick={() => addFromDirectory(entry)}
                      className="px-2.5 py-1 rounded-lg text-[12px] font-bold bg-[#EDE8FF] text-[#7A2CEE] hover:bg-[#E0D5FF] disabled:opacity-40 cursor-pointer"
                    >
                      {already ? "추가됨" : "이번 신청에 포함"}
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => deactivateDirectory(entry.id)}
                      title="디렉터리에서 비활성"
                      className="w-8 h-8 rounded-lg border border-[#E0E3E8] bg-white hover:bg-[#FFECEC] text-[#E52E2E] flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {inactiveDir.length > 0 && (
          <p className="text-[11px] text-[#9CA3AF] mt-2">
            비활성 {inactiveDir.length}명 (필요 시 같은 이메일로 다시 추가하면 재활성화됩니다)
          </p>
        )}
      </div>

      {/* 새 수신자 추가 */}
      <div className="border-t border-[#F3F4F6] pt-4 space-y-3">
        <h3 className="text-[13px] font-bold text-[#101317]">새 수신자 추가 (디렉터리에 유지)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="이름" required>
            <TextInput
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="홍길동"
              disabled={disabled || saving}
            />
          </Field>
          <Field label="이메일" required>
            <TextInput
              type="email"
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="ops@stmx.co"
              disabled={disabled || saving}
            />
          </Field>
          <Field label="역할">
            <SelectInput
              value={draft.role || "ops"}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
              disabled={disabled || saving}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="연락처">
            <TextInput
              value={draft.phone || ""}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="010-0000-0000"
              disabled={disabled || saving}
            />
          </Field>
        </div>
        <button
          type="button"
          onClick={addDraft}
          disabled={disabled || saving}
          className="px-3 py-2 rounded-xl bg-[#101317] text-white text-[13px] font-semibold hover:bg-[#101317]/90 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" />
          {saving ? "저장 중…" : "추가하고 이번 신청에 포함"}
        </button>
      </div>

      {/* 이번 신청 첨부 목록 */}
      <div className="border-t border-[#F3F4F6] pt-4">
        <h3 className="text-[13px] font-bold text-[#101317] mb-2">
          이번 신청 알림 대상 ({value.length}명)
        </h3>
        {value.length === 0 ? (
          <p className="text-[12px] text-[#E52E2E]">최소 1명을 지정해야 제출할 수 있습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {value.map((r, idx) => (
              <li
                key={`${r.email}-${idx}`}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[#C3EED3] bg-[#E6F8ED]"
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#0E8A42] truncate">
                    {r.name}
                    {r.role && (
                      <span className="ml-1.5 text-[11px] font-medium opacity-80">
                        ({ROLE_OPTIONS.find((o) => o.value === r.role)?.label || r.role})
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[#0E8A42]/80 truncate">{r.email}</div>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeAt(idx)}
                  className="w-8 h-8 rounded-lg bg-white/80 border border-[#C3EED3] text-[#0E8A42] hover:bg-white flex items-center justify-center cursor-pointer"
                  title="이번 신청에서 제외"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
