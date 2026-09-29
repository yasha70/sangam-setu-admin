import type { Metadata } from "next";
import { ChatList } from "@/components/ChatList";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { chatListFor } from "@/lib/data";

export const metadata: Metadata = { title: "Chats" };

export default async function ChatsPage() {
  const user = await requireUser("/chat");
  const chats = await chatListFor(user.id);
  return (
    <main className="chat-shell">
      <ChatList initial={chats} />
      <div className="chat-empty">
        <div>
          <Icon name="chat" className="ico" />
          <h2>Your conversations</h2>
          <p>Choose a chat on the left. You can chat with anyone whose interest you accepted, or who accepted yours.</p>
        </div>
      </div>
    </main>
  );
}
