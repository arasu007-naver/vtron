// @ts-nocheck
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Shared } from "@/components/Shared";
import Button from "@/components/x/ui/button";
import { Tree } from "@/components/Tree";
import { authFetch } from "@/lib/auth-client";
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
