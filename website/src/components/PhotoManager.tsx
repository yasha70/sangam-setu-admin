"use client";

import { useRef, useState } from "react";
import { Icon } from "./Icon";
import { send, toast } from "./Toaster";

const MAX = 4;

/** Scales a photo down to at most 1600px on its long side, keeping print quality for the PDF. */
async function prepare(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && !file.type.startsWith("image/")) {
    throw new Error("Choose a photo (JPG, PNG or WebP).");
  }
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bmp, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
    return blob ?? file;
  } catch {
    return file;
  }
}

export function PhotoManager({ initial, onChange }: { initial: string[]; onChange?: (photos: string[]) => void }) {
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const update = (p: string[]) => {
    setPhotos(p);
    onChange?.(p);
  };

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      let current = photos;
      for (const file of Array.from(files).slice(0, MAX - current.length)) {
        const blob = await prepare(file);
        const form = new FormData();
        form.append("file", new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" }));
        const res = await send<{ photos: string[] }>("/api/photos", "POST", form);
        current = res.photos;
        update(current);
      }
      toast("Photo added.");
    } catch (e) {
      toast((e as Error).message, true);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function makeMain(url: string) {
    try {
      const res = await send<{ photos: string[] }>("/api/photos", "PATCH", { url });
      update(res.photos);
      toast("Main photo changed.");
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  async function remove(url: string) {
    try {
      const res = await send<{ photos: string[] }>("/api/photos", "DELETE", { url });
      update(res.photos);
      toast("Photo removed.");
    } catch (e) {
      toast((e as Error).message, true);
    }
  }

  return (
    <div className="photos">
      {photos.map((p, i) => (
        <div className="photo-slot" key={p}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p} alt={i === 0 ? "Main photo" : `Photo ${i + 1}`} />
          {i === 0 ? <span className="pill gold tag">Main photo</span> : null}
          <div className="acts">
            {i > 0 ? <button type="button" onClick={() => makeMain(p)}>Make main</button> : <span />}
            <button type="button" onClick={() => remove(p)}>Remove</button>
          </div>
        </div>
      ))}
      {photos.length < MAX ? (
        <label className="photo-add" aria-busy={busy}>
          <Icon name="camera" />
          {busy ? "Uploading…" : photos.length ? "Add another photo" : "Add your photo"}
          <input
            ref={input}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      ) : null}
    </div>
  );
}
