import { Sidebar } from "@/components/Sidebar";
import { ChatWorkspace } from "@/components/ChatWorkspace";

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <ChatWorkspace />
    </div>
  );
}
