import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookMarked, Compass, Trash2 } from 'lucide-react';
import { Panel, SectionHeader } from '@/components/ui/Panel';
import { Badge, OriginBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchField } from '@/components/ui/Field';
import { Tabs, Disclosure } from '@/components/ui/Tabs';
import { EmptyState, ErrorState, LoadingPanel } from '@/components/ui/States';
import { useApp } from '@/state/AppProvider';
import { useServiceQuery } from '@/state/useServiceQuery';
import { CATEGORY_LABELS, formatRelativeTime } from '@/lib/format';
import {
  listRecentTopics,
  listSavedAnswers,
  recordRecentTopic,
  removeSavedAnswer,
  type SavedAnswer,
} from '@/lib/savedAnswers';
import { setLatestAnswer } from '@/state/latestAnswer';

type View = 'topics' | 'saved';

export function KnowledgePage() {
  const { service } = useApp();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('topics');
  const [search, setSearch] = useState('');
  const [saved, setSaved] = useState<SavedAnswer[]>(() => listSavedAnswers());
  const recent = useMemo(() => listRecentTopics(), [view]);

  const topics = useServiceQuery((signal) => service.listKnowledgeTopics(signal), [service]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const all = topics.data ?? [];
    if (!term) return all;
    return all.filter(
      (topic) =>
        topic.name.toLowerCase().includes(term) ||
        topic.summary.toLowerCase().includes(term) ||
        topic.questions.some((question) => question.toLowerCase().includes(term)),
    );
  }, [topics.data, search]);

  const askTopicQuestion = (topicName: string, question: string) => {
    recordRecentTopic(topicName);
    navigate('/assistant', { state: { question } });
  };

  return (
    <div className="mx-auto w-full max-w-content space-y-5 px-4 py-5 sm:px-6">
      <Panel padded>
        <SectionHeader
          eyebrow="Workspace"
          title="Health knowledge"
          description="What the knowledge base covers, the questions it answers well, and the answers you have kept."
        />
        <Tabs
          className="mt-4"
          label="Knowledge views"
          value={view}
          onChange={setView}
          items={[
            { value: 'topics', label: 'Topics', count: topics.data?.length },
            { value: 'saved', label: 'Saved answers', count: saved.length },
          ]}
        />
      </Panel>

      {view === 'topics' && (
        <>
          <SearchField
            label="Search topics"
            value={search}
            onValueChange={setSearch}
            placeholder="Search topics and starter questions"
          />

          {recent.length > 0 && (
            <Panel padded>
              <p className="eyebrow">Recently explored</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {recent.map((topic) => (
                  <Badge key={topic} tone="neutral" pill>
                    {topic}
                  </Badge>
                ))}
              </div>
            </Panel>
          )}

          {topics.loading && <LoadingPanel label="Loading topics" lines={6} />}

          {topics.error && (
            <ErrorState
              error={topics.error}
              onRetry={topics.refetch}
              retrying={topics.refreshing}
              title="Could not load knowledge topics"
            />
          )}

          {!topics.loading && !topics.error && filtered.length === 0 && (
            <Panel>
              <EmptyState
                icon={<Compass className="h-5 w-5" aria-hidden />}
                title="No topics match that search"
                description="Try a broader term, or clear the search to see everything the knowledge base covers."
              />
            </Panel>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map((topic) => (
              <Panel key={topic.id} padded className="h-full">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone="brand">{CATEGORY_LABELS[topic.category]}</Badge>
                  <OriginBadge origin={topic.origin} compact />
                </div>
                <h3 className="mt-2 text-sm font-semibold text-ink">{topic.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">{topic.summary}</p>

                <div className="mt-3 border-t border-line pt-1">
                  <Disclosure
                    summary={
                      <span className="text-xs">
                        Starter questions ({topic.questions.length})
                      </span>
                    }
                  >
                    <ul className="space-y-1">
                      {topic.questions.map((question) => (
                        <li key={question}>
                          <button
                            type="button"
                            onClick={() => askTopicQuestion(topic.name, question)}
                            className="w-full rounded-md border border-transparent px-2 py-1.5 text-left text-xs text-ink transition-colors hover:border-line hover:bg-surface-sunken"
                          >
                            {question}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </Disclosure>
                </div>

                <p className="mt-1 text-2xs text-ink-subtle">
                  {topic.documentIds.length} source{' '}
                  {topic.documentIds.length === 1 ? 'document' : 'documents'} in the library
                </p>
              </Panel>
            ))}
          </div>
        </>
      )}

      {view === 'saved' && (
        <>
          {saved.length === 0 ? (
            <Panel>
              <EmptyState
                icon={<BookMarked className="h-5 w-5" aria-hidden />}
                title="Nothing saved yet"
                description="Use Save on any answer to keep it here. Saved answers are stored in this browser only — they are not synced to an account."
              />
            </Panel>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-ink-muted">
                Stored in this browser only. Clearing site data removes them.
              </p>
              {saved.map((item) => (
                <Panel key={item.id} padded>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-ink">{item.question}</h3>
                      <p className="mt-0.5 text-2xs text-ink-subtle">
                        Saved {formatRelativeTime(item.savedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <OriginBadge origin={item.answer.origin} compact />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label={`Remove saved answer: ${item.question}`}
                        onClick={() => setSaved(removeSavedAnswer(item.id))}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {item.answer.summary}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    <span className="text-2xs text-ink-subtle">
                      {item.answer.citations.length} source
                      {item.answer.citations.length === 1 ? '' : 's'}
                    </span>
                    {item.answer.citations.length > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setLatestAnswer({
                            question: item.question,
                            answer: item.answer,
                            messageId: item.id,
                            answeredAt: item.savedAt,
                          });
                          navigate('/evidence');
                        }}
                      >
                        Inspect evidence
                      </Button>
                    )}
                  </div>
                </Panel>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
