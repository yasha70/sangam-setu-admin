"use client";

import { useState } from "react";
import { Silhouette } from "./Icon";

export function Gallery({ photos, name }: { photos: string[]; name: string }) {
  const [i, setI] = useState(0);
  const current = photos[i] ?? photos[0];
  return (
    <div className="gallery">
      <div className="main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {current ? <img src={current} alt={name} /> : <Silhouette />}
      </div>
      {photos.length > 1 ? (
        <div className="thumbs">
          {photos.map((p, n) => (
            <button key={p} type="button" aria-pressed={n === i} aria-label={`Photo ${n + 1}`} onClick={() => setI(n)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
