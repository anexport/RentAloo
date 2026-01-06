import { MobileHeader } from '@/components/navigation/MobileHeader';

export function ConversationScreen() {
  return (
    <div className="flex flex-col min-h-screen">
      <MobileHeader title="Chat" showBack />
      <div className="flex-1 p-4">
        <p className="text-muted-foreground">Conversation screen</p>
      </div>
    </div>
  );
}
