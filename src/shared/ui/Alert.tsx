import type { ReactNode } from "react";

export function Alert({ children, tone = "warn" }: { children: ReactNode; tone?: "error" | "info" | "success" | "warn" }) {
  return <div className={`alert alert-${tone}`}>{children}</div>;
}
