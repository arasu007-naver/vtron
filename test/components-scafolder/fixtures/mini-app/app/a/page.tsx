import { Plus } from "lucide-react";
import { motion } from "framer-motion";
// @ts-expect-error -- fixture-relative alias
import { Shared } from "@/components/Shared";
// @ts-expect-error -- fixture-relative alias
import Button from "@/components/x/ui/button";
// @ts-expect-error -- fixture-relative alias
import { Tree } from "@/components/Tree";
import { authFetch } from "@/lib/auth-client";
// @ts-expect-error -- fixture-relative alias
import { fetchThings } from "@/lib/things-client";

function loadAll() {
  return authFetch("/api/items");
}

function Row() {
  return <li>row</li>;
}

export default function APage() {
  // "/api/ghost" — comment must be ignored
  /* /api/ghost */
  const id = "1";
  void authFetch(`/api/items/${id}`);
  void authFetch("/api/items/" + id);
  void loadAll();
  void fetchThings();

  return (
    <>
      <Row />
      <Shared />
      <Button />
      <Tree />
      <Plus />
      <motion.div />
    </>
  );
}
