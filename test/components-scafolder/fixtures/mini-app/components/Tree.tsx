export function Tree({ depth = 0 }: { depth?: number }) {
  return <div>{depth > 0 && <Tree depth={depth - 1} />}</div>;
}
