import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileWarning, Library, Upload } from 'lucide-react';
import { cn } from '@/lib/cn';
import { appConfig } from '@/config/env';
import { Panel, SectionHeader } from '@/components/ui/Panel';
import { Badge, OriginBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Field, SearchField, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/Tabs';
import { EmptyState, ErrorState, LoadingPanel } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/state/AppProvider';
import { useServiceQuery } from '@/state/useServiceQuery';
import {
  CATEGORY_LABELS,
  SOURCE_TYPE_LABELS,
  STAGE_LABELS,
  STATUS_LABELS,
  formatBytes,
  formatDate,
  formatRelativeTime,
} from '@/lib/format';
import type {
  DocumentCategory,
  DocumentRecord,
  DocumentStatus,
  ProcessingStatus,
} from '@/types/models';

const STATUS_TONE: Record<DocumentStatus, 'success' | 'accent' | 'neutral' | 'danger'> = {
  indexed: 'success',
  processing: 'accent',
  queued: 'neutral',
  failed: 'danger',
};

export function LibraryPage() {
  const { service } = useApp();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState<DocumentCategory | 'all'>('all');
  const [status, setStatus] = useState<DocumentStatus | 'all'>('all');
  const [preview, setPreview] = useState<DocumentRecord | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = useServiceQuery(
    (signal) =>
      service.listDocuments({ search: debounced, category, status, sort: 'recent' }, signal),
    [service, debounced, category, status],
  );

  const documents = query.data?.documents ?? [];
  const processingCount = documents.filter((doc) => doc.status === 'processing').length;

  return (
    <div className="mx-auto w-full max-w-content space-y-5 px-4 py-5 sm:px-6">
      <Panel padded>
        <SectionHeader
          eyebrow="Knowledge base"
          title="Document library"
          description="These documents define what the assistant is allowed to answer from. Nothing outside this set is used to produce an answer."
          actions={
            <Button
              variant="primary"
              onClick={() => setUploadOpen(true)}
              leadingIcon={<Upload className="h-3.5 w-3.5" aria-hidden />}
            >
              Add document
            </Button>
          }
        />

        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <SearchField
            label="Search documents"
            value={search}
            onValueChange={setSearch}
            placeholder="Search by title, publisher or description"
          />
          <Select
            aria-label="Filter by category"
            value={category}
            onChange={(event) => setCategory(event.target.value as DocumentCategory | 'all')}
            options={[
              { value: 'all', label: 'All categories' },
              ...Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => setStatus(event.target.value as DocumentStatus | 'all')}
            options={[
              { value: 'all', label: 'Any status' },
              ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
            ]}
          />
        </div>

        {query.data && (
          <p className="mt-2 text-xs text-ink-muted">
            {query.data.total} {query.data.total === 1 ? 'document' : 'documents'}
            {processingCount > 0 && ` · ${processingCount} still processing`}
          </p>
        )}
      </Panel>

      {query.loading && <LoadingPanel label="Loading documents" lines={5} />}

      {query.error && (
        <ErrorState
          error={query.error}
          onRetry={query.refetch}
          retrying={query.refreshing}
          title="Could not load the document library"
        />
      )}

      {!query.loading && !query.error && documents.length === 0 && (
        <Panel>
          <EmptyState
            icon={<Library className="h-5 w-5" aria-hidden />}
            title="No documents match these filters"
            description="Clear the search or widen the filters to see the rest of the knowledge base."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                  setStatus('all');
                }}
              >
                Clear filters
              </Button>
            }
          />
        </Panel>
      )}

      {documents.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {documents.map((document) => (
            <li key={document.id}>
              <DocumentCard document={document} onOpen={() => setPreview(document)} />
            </li>
          ))}
        </ul>
      )}

      <DocumentPreview
        document={preview}
        onClose={() => setPreview(null)}
        onIngestionComplete={query.refetch}
      />

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(name) => {
          toast.push({
            tone: 'success',
            title: 'Upload accepted',
            description: `${name} was accepted for ingestion. Track progress on its card.`,
          });
          query.refetch();
        }}
      />
    </div>
  );
}

function DocumentCard({
  document,
  onOpen,
}: {
  document: DocumentRecord;
  onOpen: () => void;
}) {
  return (
    <Panel
      padded
      interactive
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      className="h-full"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={STATUS_TONE[document.status]}>{STATUS_LABELS[document.status]}</Badge>
        <Badge tone="neutral">{CATEGORY_LABELS[document.category]}</Badge>
        <OriginBadge origin={document.origin} compact />
      </div>

      <h3 className="mt-2 text-sm font-semibold leading-snug text-ink">{document.title}</h3>
      <p className="mt-0.5 text-xs text-ink-muted">
        {document.publisher} · {formatDate(document.publishedOn)}
      </p>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-ink-muted">
        {document.description}
      </p>

      {document.status === 'failed' && document.failureReason && (
        <p className="mt-2 flex items-start gap-1.5 rounded border border-danger-border bg-danger-soft p-2 text-2xs leading-relaxed text-ink">
          <FileWarning className="mt-px h-3 w-3 shrink-0 text-danger" aria-hidden />
          {document.failureReason}
        </p>
      )}

      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2.5 text-2xs text-ink-subtle">
        <div className="flex gap-1">
          <dt>Added</dt>
          <dd className="font-medium text-ink-muted">{formatRelativeTime(document.addedAt)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Size</dt>
          <dd className="font-medium text-ink-muted">{formatBytes(document.sizeBytes)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Passages</dt>
          <dd className="font-medium text-ink-muted">{document.chunkCount ?? '—'}</dd>
        </div>
      </dl>
    </Panel>
  );
}

function DocumentPreview({
  document,
  onClose,
  onIngestionComplete,
}: {
  document: DocumentRecord | null;
  onClose: () => void;
  /** Called once ingestion finishes, so the library list stops showing a stale status. */
  onIngestionComplete: () => void;
}) {
  const { service } = useApp();
  const [progress, setProgress] = useState<ProcessingStatus | null>(null);

  const poll = useCallback(async () => {
    if (!document || document.status === 'indexed') return;
    try {
      const status = await service.getProcessingStatus(document.id);
      setProgress(status);
      if (status.stage === 'complete') onIngestionComplete();
    } catch {
      /* The card already shows the stored status; polling is best-effort. */
    }
  }, [document, service, onIngestionComplete]);

  useEffect(() => {
    setProgress(null);
    if (!document) return;
    void poll();
    if (document.status !== 'processing') return;
    const interval = window.setInterval(() => void poll(), 2_500);
    return () => window.clearInterval(interval);
  }, [document, poll]);

  if (!document) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={document.title}
      description={`${document.publisher} · ${SOURCE_TYPE_LABELS[document.sourceType]}`}
      titleAccessory={<OriginBadge origin={document.origin} compact />}
      size="lg"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={STATUS_TONE[document.status]}>{STATUS_LABELS[document.status]}</Badge>
          <Badge tone="neutral">{CATEGORY_LABELS[document.category]}</Badge>
        </div>

        <p className="text-sm leading-relaxed text-ink-muted">{document.description}</p>

        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface-sunken p-3 text-xs sm:grid-cols-4">
          {[
            ['Published', formatDate(document.publishedOn)],
            ['Added', formatDate(document.addedAt)],
            ['Pages', document.pageCount?.toString() ?? '—'],
            ['Passages', document.chunkCount?.toString() ?? '—'],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-2xs uppercase tracking-[0.04em] text-ink-subtle">{label}</dt>
              <dd className="mt-0.5 font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {progress && document.status !== 'indexed' && (
          <div className="space-y-2 rounded-lg border border-line p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink">{STAGE_LABELS[progress.stage]}</span>
              <span className="tabular-nums text-ink-muted">
                {Math.round(progress.progress * 100)}%
              </span>
            </div>
            <ProgressBar
              value={progress.progress}
              label="Ingestion progress"
              tone={progress.stage === 'failed' ? 'danger' : 'accent'}
            />
            <p className="text-xs text-ink-muted">{progress.message}</p>
          </div>
        )}

        <div className="rounded-lg border border-dashed border-line-strong bg-surface-sunken p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-ink-muted">
            Document rendering
          </p>
          <p className="mt-1 max-w-prose text-xs leading-relaxed text-ink-muted">
            Page-level PDF preview is served by the backend document store and is not available
            in the frontend alone. Until that endpoint exists, retrieved passages from this
            document are inspectable through any answer that cites it.
          </p>
        </div>
      </div>
    </Modal>
  );
}

function UploadDialog({
  open,
  onClose,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: (name: string) => void;
}) {
  const { service } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('general_health');
  const [publisher, setPublisher] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setPublisher('');
    setError(null);
    setBusy(false);
  };

  const maxLabel = useMemo(
    () => `${Math.round(appConfig.maxUploadBytes / (1024 * 1024))} MB`,
    [],
  );

  const accept = (candidate: File | undefined) => {
    if (!candidate) return;
    if (!/\.pdf$/i.test(candidate.name)) {
      setError('Only PDF documents can be ingested.');
      return;
    }
    if (candidate.size > appConfig.maxUploadBytes) {
      setError(`That file is larger than the ${maxLabel} limit.`);
      return;
    }
    setError(null);
    setFile(candidate);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await service.uploadDocument({ file, category, publisher: publisher.trim() });
      onUploaded(file.name);
      reset();
      onClose();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'The upload failed and nothing was ingested.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Add a document"
      description="Uploaded PDFs are queued for extraction, chunking, embedding and indexing by the backend."
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!file} loading={busy}>
            Upload
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            accept(event.dataTransfer.files[0]);
          }}
          className={cn(
            'rounded-lg border-2 border-dashed p-6 text-center transition-colors',
            dragging ? 'border-brand bg-brand-soft' : 'border-line-strong bg-surface-sunken',
          )}
        >
          <Upload className="mx-auto h-5 w-5 text-ink-subtle" aria-hidden />
          <p className="mt-2 text-sm font-medium text-ink">
            {file ? file.name : 'Drop a PDF here'}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {file ? formatBytes(file.size) : `PDF only · up to ${maxLabel}`}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(event) => accept(event.target.files?.[0])}
          />
          <Button
            className="mt-3"
            variant="secondary"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Choose file
          </Button>
        </div>

        <Field label="Publisher or source" htmlFor="upload-publisher" hint="Optional, but it is what appears on every citation from this document.">
          <input
            id="upload-publisher"
            value={publisher}
            onChange={(event) => setPublisher(event.target.value)}
            placeholder="e.g. Ministry of Health"
            className="h-9 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-subtle"
          />
        </Field>

        <Field label="Category" htmlFor="upload-category">
          <Select
            id="upload-category"
            value={category}
            onChange={(event) => setCategory(event.target.value as DocumentCategory)}
            options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-md border border-danger-border bg-danger-soft p-2.5 text-xs text-ink">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
