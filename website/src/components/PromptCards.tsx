"use client";

import { Icon } from "./Icon";
import { openInterest } from "./Interest";
import type { PromptAnswer } from "@/lib/types";

export function PromptCards({ prompts, target }: { prompts: PromptAnswer[]; target?: { id: string; name: string; photo?: string | null } }) {
  if (!prompts.length) return null;
  return (
    <div className="prompts">
      {prompts.map((p) => (
        <figure key={p.q} className="prompt-card">
          <figcaption>{p.q}</figcaption>
          <blockquote>{p.a}</blockquote>
          {target ? (
            <button
              type="button"
              className="like-btn"
              aria-label={`Like this answer and send ${target.name.split(" ")[0]} an interest`}
              title="Like this answer"
              onClick={() => openInterest({ ...target, liked: `${p.q} ${p.a}`.slice(0, 240) })}
            >
              <Icon name="heart" />
            </button>
          ) : null}
        </figure>
      ))}
    </div>
  );
}
