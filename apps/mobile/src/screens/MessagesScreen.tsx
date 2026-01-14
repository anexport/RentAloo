import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, AlertCircle, User } from 'lucide-react';
import { MobileHeader } from '@/components/navigation/MobileHeader';
import { useAuth } from '@/hooks/useAuth';
import { 
  fetchConversations, 
  subscribeToConversations,
  type Conversation 
} from '@/services/messaging';
import { cn } from '@/lib/utils';

export function MessagesScreen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async (isRefresh = false) => {
    if (!user) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchConversations(user.id);
      setConversations(data);
    } catch (err) {
      console.error('[MessagesScreen] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToConversations(user.id, () => {
      loadConversations(true);
    });

    return unsubscribe;
  }, [user, loadConversations]);

  const handleConversationClick = (conversationId: string) => {
    navigate(`/conversation/${conversationId}`);
  };

  // Pull to refresh handler (for native feel)
  const handleRefresh = () => {
    loadConversations(true);
  };

  // Format relative time
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <MobileHeader title="Messages" />
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 bg-card rounded-xl border border-border"
            >
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </div>
              <div className="h-3 bg-muted rounded animate-pulse w-10 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <MobileHeader title="Messages" />
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-destructive font-medium mb-2">Failed to load messages</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => loadConversations()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm min-h-11"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <MobileHeader title="Messages" />

      {/* Content with iOS-style overscroll */}
      <div 
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ 
          WebkitOverflowScrolling: 'touch', // iOS smooth scrolling
        }}
      >
        {/* Pull to refresh indicator */}
        {refreshing && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          </div>
        )}

        {/* Empty state */}
        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              When you contact an owner or receive a booking request, your conversations will appear here
            </p>
          </div>
        )}

        {/* Conversation list */}
        {conversations.length > 0 && (
          <div className="divide-y divide-border">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-4 text-left',
                  'active:bg-muted/50 transition-colors',
                  'min-h-[72px]', // Touch target
                  conversation.unreadCount > 0 && 'bg-primary/5'
                )}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {conversation.otherParticipant.avatar ? (
                      <img
                        src={conversation.otherParticipant.avatar}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  {/* Unread indicator */}
                  {conversation.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      'font-medium truncate',
                      conversation.unreadCount > 0 ? 'text-foreground' : 'text-foreground/90'
                    )}>
                      {conversation.otherParticipant.name || 
                       conversation.otherParticipant.email?.split('@')[0] || 
                       'Unknown'}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTime(conversation.lastMessage?.createdAt ?? conversation.updatedAt)}
                    </span>
                  </div>
                  
                  {/* Equipment title */}
                  {conversation.equipmentTitle && (
                    <p className="text-xs text-primary truncate">
                      {conversation.equipmentTitle}
                    </p>
                  )}
                  
                  {/* Last message preview */}
                  <p className={cn(
                    'text-sm truncate mt-0.5',
                    conversation.unreadCount > 0 
                      ? 'text-foreground font-medium' 
                      : 'text-muted-foreground'
                  )}>
                    {conversation.lastMessage?.content || 'No messages yet'}
                  </p>
                </div>

                {/* Chevron for iOS feel */}
                <svg 
                  className="w-5 h-5 text-muted-foreground/50 shrink-0" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* Bottom safe area spacer */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );
}
