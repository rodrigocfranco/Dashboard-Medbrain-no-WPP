import Header from '@/components/layout/header';
import ChatInterface from '@/components/ai-chat/chat-interface';

export default function AISQLPage() {
  return (
    <div>
      <Header title="Assistente IA SQL" />
      <div className="p-6">
        <ChatInterface />
      </div>
    </div>
  );
}
