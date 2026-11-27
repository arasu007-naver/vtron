import { MemoCard, FwdInput, MemoFwdBox } from "../../../components/Wrapped";
import * as ns from "../../../lib/ns-client";
import { d1 } from "../../../lib/depth1";

export default function PromoPage() {
  const id = "42";
  void fetch("/api/items?page=1#top");
  void fetch(`/api/items/${id}?expand=true#details`);
  void ns.fetchViaNs();
  void d1();

  return (
    <main>
      <MemoCard />
      <FwdInput />
      <MemoFwdBox />
    </main>
  );
}
