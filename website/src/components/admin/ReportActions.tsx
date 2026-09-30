"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { send, toast } from "../Toaster";

export function ReportActions({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async (action: "dismiss" | "suspend") => {
    setBusy(true);
    try {
      const res = await send<{ message: string }>(`/api/admin/reports/${id}`, "POST", { action });
      toast(res.message);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
      setBusy(false);
    }
  };
  return (
    <div className="row">
      <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => act("dismiss")}>Dismiss</button>
      <button className="btn btn-danger-solid btn-sm" disabled={busy} onClick={() => act("suspend")}>Suspend account</button>
    </div>
  );
}
