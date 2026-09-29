"use client";

import { useRef, useState } from "react";
import { Icon } from "./Icon";
import { PDF_TEMPLATES } from "@/lib/options";

export function PdfButton({ userId, isSelf, label = "Download PDF" }: { userId?: string; isSelf: boolean; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [template, setTemplate] = useState<string>("royal");
  const [contact, setContact] = useState(true);
  const [address, setAddress] = useState(false);

  const params = new URLSearchParams({ t: template, contact: contact ? "1" : "0", address: address ? "1" : "0" });
  if (userId && !isSelf) params.set("id", userId);
  const href = `/api/pdf?${params}`;

  return (
    <>
      <button type="button" className="btn btn-gold" onClick={() => dialog.current?.showModal()}>
        <Icon name="download" />
        {label}
      </button>
      <dialog ref={dialog} className="sheet" aria-labelledby="pdf-title">
        <form method="dialog" className="stack" style={{ gap: 10 }}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <h2 id="pdf-title">Download biodata</h2>
              <p className="muted small">A4 PDF with sharp text and full-resolution photos, ready to print or share.</p>
            </div>
            <button className="icon-btn" aria-label="Close" value="close">
              <Icon name="x" />
            </button>
          </div>

          <div className="templates" role="radiogroup" aria-label="Design">
            {PDF_TEMPLATES.map((t) => (
              <label key={t.id}>
                <input type="radio" name="tpl" value={t.id} checked={template === t.id} onChange={() => setTemplate(t.id)} />
                <span className="tpl">
                  <i
                    style={{
                      background: `linear-gradient(180deg, ${t.swatch[0]} 0 30%, ${t.swatch[1]} 30% 33%, ${t.swatch[2]} 33%)`,
                      boxShadow: `inset 0 0 0 2px ${t.swatch[1]}`,
                    }}
                  />
                  {t.name}
                </span>
              </label>
            ))}
          </div>

          <label className="check">
            <input type="checkbox" checked={contact} onChange={(e) => setContact(e.target.checked)} />
            <span>Include contact person and mobile number</span>
          </label>
          {isSelf ? (
            <label className="check">
              <input type="checkbox" checked={address} onChange={(e) => setAddress(e.target.checked)} />
              <span>Include full address <span className="muted">(only on this PDF, never on your profile)</span></span>
            </label>
          ) : null}

          <div className="row" style={{ marginTop: 8 }}>
            <a className="btn btn-ghost" href={`${href}&view=1`} target="_blank" rel="noopener">
              <Icon name="eye" />
              Preview
            </a>
            <span className="spacer" />
            <a className="btn btn-gold" href={href} download>
              <Icon name="download" />
              Download PDF
            </a>
          </div>
        </form>
      </dialog>
    </>
  );
}
