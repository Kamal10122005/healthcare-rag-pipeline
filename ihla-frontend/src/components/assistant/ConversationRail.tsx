import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { OriginBadge } from '@/components/ui/Badge';
import { EmptyState, ErrorState, SkeletonLines } from '@/components/ui/States';
import type { ConversationController } from '@/state/useConversation';

/** Conversation history list. Fails independently of the composer. */
export function ConversationRail({
  controller,
  onDelete,
}: {
  controller: ConversationController;
  onDelete: (id: string) => void;
}) {
  const {
    conversations,
    conversationsLoading,
    conversationsError,
    reloadConversations,
    conversationId,
    select,
    startNew,
  } = controller;

  return (
    <div className="flex h-full flex-col gap-3">
      <Button
        variant="secondary"
        fullWidth
        onClick={startNew}
        leadingIcon={<MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />}
      >
        New conversation
      </Button>

      <p className="eyebrow px-1">History</p>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
        {conversationsLoading && <SkeletonLines lines={4} className="px-1" />}

        {!conversationsLoading && conversationsError && (
          <ErrorState
            compact
            error={conversationsError}
            onRetry={reloadConversations}
            title="Could not load history"
          />
        )}

        {!conversationsLoading && !conversationsError && conversations.length === 0 && (
          <EmptyState
            compact
            title="No conversations yet"
            description="Your questions appear here once you ask one."
          />
        )}

        {conversations.map((conversation) => {
          const active = conversation.id === conversationId;
          return (
            <div
              key={conversation.id}
              className={cn(
                'group flex items-start gap-1 rounded-md border px-2 py-2 transition-colors',
                active
                  ? 'border-brand-border bg-brand-soft'
                  : 'border-transparent hover:border-line hover:bg-surface-sunken',
              )}
            >
              <button
                type="button"
                onClick={() => select(conversation.id)}
                aria-current={active ? 'true' : undefined}
                className="min-w-0 flex-1 text-left"
              >
                <p
                  className={cn(
                    'truncate text-xs font-medium',
                    active ? 'text-brand' : 'text-ink',
                  )}
                >
                  {conversation.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-2xs text-ink-subtle">
                  <span>{formatRelativeTime(conversation.updatedAt)}</span>
                  <span aria-hidden>·</span>
                  <span>{conversation.messageCount} turns</span>
                  <OriginBadge origin={conversation.origin} compact />
                </p>
              </button>
              <button
                type="button"
                onClick={() => onDelete(conversation.id)}
                aria-label={`Delete conversation: ${conversation.title}`}
                className="shrink-0 rounded p-1 text-ink-subtle opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
