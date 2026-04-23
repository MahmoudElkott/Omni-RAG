import { Sidebar } from "@/components/Sidebar";
import { ChatWorkspace } from "@/components/ChatWorkspace";

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink">
      <Sidebar />
      <ChatWorkspace />
    </div>
  );
}
