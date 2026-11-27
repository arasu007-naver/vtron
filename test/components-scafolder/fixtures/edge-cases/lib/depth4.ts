import { d5 } from "./depth5";

export function d4() {
  void fetch("/api/depth4");
  return d5();
}
