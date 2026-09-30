import type { Metadata } from "next";
import Link from "next/link";
import { ChatList } from "@/components/ChatList";
import { Conversation } from "@/components/Conversation";
import { requireUser } from "@/lib/auth";
import { ageFrom } from "@/lib/bio";
import { activityLabel, canChat, chatListFor, getBiodata, getMessages, getUser, markRead, readMarker } from "@/lib/data";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/chat/${id}`);

  if (!(await canChat(user.id, id))) {
    return (
      <main className="auth">
        <div className="card stack">
          <h1>Chat not open yet</h1>
          <p className="muted">You can chat once an interest between you is accepted.</p>
          <Link className="btn btn-gold" href={`/profile/${id}`}>View their biodata</Link>
        </div>
      </main>
    );
  }

  const [bio, messages, theirRead, other] = await Promise.all([getBiodata(id), getMessages(user.id, id, 0), readMarker(id, user.id), getUser(id)]);
  if (messages.length) await markRead(user.id, id, messages[messages.length - 1].ts);
  const chats = await chatListFor(user.id);
  const age = ageFrom(bio?.dob);
  const line = [activityLabel(other?.lastActive), age !== null ? `${age} yrs` : null, bio?.city].filter(Boolean).join(" · ");

  return (
    <main className="chat-shell has-convo">
      <ChatList initial={chats} activeId={id} />
      <Conversation
        key={id}
        me={user.id}
        other={{ id, name: bio?.fullName ?? "Unnamed", photo: bio?.photos[0] ?? null, line }}
        initial={messages}
        initialRead={theirRead}
      />
    </main>
  );
}
