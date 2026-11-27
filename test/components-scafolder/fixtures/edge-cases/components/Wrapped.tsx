import { forwardRef, memo } from "react";

export const MemoCard = memo(function MemoCard() {
  return <article>memo</article>;
});

export const FwdInput = forwardRef<HTMLInputElement>(function FwdInput(_props, ref) {
  return <input ref={ref} />;
});

export const MemoFwdBox = memo(
  forwardRef<HTMLDivElement>(function MemoFwdBox(_props, ref) {
    return <div ref={ref} />;
  })
);
