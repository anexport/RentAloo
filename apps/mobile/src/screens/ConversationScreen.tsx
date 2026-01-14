import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, AlertCircle, User, Image as ImageIcon } from 'lucide-react';
import { MobileHeader } from '@/components/navigation/MobileHeader';
import { useAuth } from '@/hooks/useAuth';
import { 
  fetchMessages, 
  sendMessage, 
  subscribeToMessages,
  markConversationAsRead,
  type Message 
} from '@/services/messaging';
import { cn } from '@/lib/utils';

export function ConversationScreen() {
  const { id: conversationId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? 'smooth' : 'auto' 
    });
  }, []);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchMessages(conversationId);
      setMessages(data);
      // Mark as read
      if (user) {
        markConversationAsRead(conversationId, user.id);
      }
    } catch (err) {
      console.error('[ConversationScreen] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom(false);
    }
  }, [loading, messages.length, scrollToBottom]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = subscribeToMessages(conversationId, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
      // Mark as read if from other user
      if (user && newMessage.sender_id !== user.id) {
        markConversationAsRead(conversationId, user.id);
      }
      scrollToBottom();
    });

    return unsubscribe;
  }, [conversationId, user, scrollToBottom]);

  // Handle send message
  const handleSend = async () => {
    if (!inputValue.trim() || !conversationId || !user || sending) return;

    const content = inputValue.trim();
    setInputValue('');
    setSending(true);

    try {
      const newMessage = await sendMessage(conversationId, user.id, content);
      // Message will be added via subscription
    } catch (err) {
      console.error('[ConversationScreen] Send error:', err);
      // Restore input on error
      setInputValue(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // Handle input key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Format time
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Group messages by date
  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    msgs.forEach(msg => {
      const msgDate = new Date(msg.created_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <MobileHeader title="Chat" showBack />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <MobileHeader title="Chat" showBack />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive font-medium mb-2">Failed to load conversation</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={loadMessages}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm min-h-11"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className="flex flex-col h-screen bg-background">
      <MobileHeader title="Chat" showBack />

      {/* Messages container */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Send className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">Start the conversation</p>
            <p className="text-sm text-muted-foreground">
              Send a message to get started
            </p>
          </div>
        )}

        {/* Message groups */}
        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {group.date}
              </span>
            </div>

            {/* Messages */}
            {group.messages.map((message, msgIndex) => {
              const isOwn = message.sender_id === user?.id;
              const showAvatar = !isOwn && (
                msgIndex === 0 || 
                group.messages[msgIndex - 1]?.sender_id !== message.sender_id
              );

              return (
                <div
                  key={message.id}
                  className={cn(
                    'flex mb-2',
                    isOwn ? 'justify-end' : 'justify-start'
                  )}
                >
                  {/* Avatar placeholder for alignment */}
                  {!isOwn && (
                    <div className="w-8 shrink-0 mr-2">
                      {showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {message.sender?.avatar_url ? (
                            <img 
                              src={message.sender.avatar_url} 
                              alt="" 
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-2',
                      isOwn 
                        ? 'bg-primary text-primary-foreground rounded-br-md' 
                        : 'bg-muted text-foreground rounded-bl-md'
                    )}
                  >
                    {message.message_type === 'image' ? (
                      <div className="flex items-center gap-2 text-sm">
                        <ImageIcon className="h-4 w-4" />
                        <span>Image</span>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}
                    <p className={cn(
                      'text-[10px] mt-1',
                      isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area - fixed at bottom with safe area */}
      <div 
        className="border-t border-border bg-background"
        style={{ 
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-center gap-2 p-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className={cn(
              'flex-1 px-4 py-3 bg-muted rounded-full text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary',
              'min-h-11'
            )}
            disabled={sending}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            className={cn(
              'p-3 rounded-full min-h-11 min-w-11 flex items-center justify-center',
              'transition-colors',
              inputValue.trim() && !sending
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
