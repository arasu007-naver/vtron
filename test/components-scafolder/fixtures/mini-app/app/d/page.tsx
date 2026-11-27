import type { ReactNode } from "react";

function HelperChild() {
  return <span>helper-child</span>;
}

function renderInner(depth = 0): ReactNode {
  if (depth > 0) return renderInner(depth - 1);
  return <HelperChild />;
}

function renderOuter() {
  return renderInner();
}

export default function APage() {
  return <div>duplicate name {renderOuter()}</div>;
}
