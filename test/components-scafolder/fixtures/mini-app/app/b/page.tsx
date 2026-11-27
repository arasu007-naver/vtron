// @ts-nocheck
import { Shared } from "@/components/Shared";
import { CONST } from "@/components/Solo";
import { authFetch } from "@/lib/auth-client";

export default function BPage() {
  const kind = "brands";
  void authFetch(`/api/cat/${kind}`);
  void authFetch("/api/nowhere");

  return (
    <div>
      {CONST}
      <Shared />
    </div>
  );
}
