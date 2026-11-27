import type { ReactNode } from "react";
import NavBar from "@/components/NavBar";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <NavBar />
      {children}
    </div>
  );
}
