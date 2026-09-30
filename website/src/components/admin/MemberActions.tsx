"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { send, toast } from "../Toaster";

type Props = { id: string; name: string; verified: boolean; hidden: boolean; suspended: boolean; sample: boolean };

export function MemberActions({ id, name, verified, hidden, suspended, sample }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState("");

  const act = async (action: string) => {
    setBusy(true);
    try {
      const res = await send<{ message: string; deleted?: boolean }>(`/api/admin/users/${id}`, "POST", { action });
      toast(res.message);
      if (res.deleted) router.push("/admin/users");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack" style={{ gap: 14 }}>
      <section className="card">
        <div className="card-head"><h2>Actions</h2></div>
        <div className="actions">
          <button className="btn btn-brand" disabled={busy} onClick={() => act(verified ? "unverify" : "verify")}>
            {verified ? "Remove verified tick" : "Mark as verified"}
          </button>
          {!sample ? (
            <>
              <button className="btn btn-ghost" disabled={busy} onClick={() => act(hidden ? "unhide" : "hide")}>
                {hidden ? "Unhide biodata" : "Hide biodata"}
              </button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => act(suspended ? "restore" : "suspend")}>
                {suspended ? "Restore account" : "Suspend account"}
              </button>
            </>
          ) : null}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>
          <b>Verify</b> after you&apos;ve checked their details, for example on a phone call. <b>Hide</b> takes the biodata out
          of browse. <b>Suspend</b> logs them out and blocks log-in.
        </p>
      </section>

      {!sample ? (
        <section className="card danger-zone">
          <div className="card-head"><h2>Delete account</h2></div>
          <p className="small" style={{ marginBottom: 10 }}>
            Deletes {name}&apos;s account, biodata, photos and connections for good. Type <b>DELETE</b> to confirm.
          </p>
          <div className="row">
            <input className="input" style={{ maxWidth: 200 }} value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type DELETE to confirm" />
            <button className="btn btn-danger-solid" disabled={busy || confirm !== "DELETE"} onClick={() => act("delete")}>
              Delete account
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
