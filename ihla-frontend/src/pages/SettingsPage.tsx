import { useState } from 'react';
import { Panel, SectionHeader } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SegmentedControl, Toggle } from '@/components/ui/Field';
import { IntegrationRequired } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { useApp } from '@/state/AppProvider';
import { appConfig } from '@/config/env';
import { READING_LEVEL_HINTS, READING_LEVEL_LABELS } from '@/lib/format';
import { clearSavedAnswers, listSavedAnswers } from '@/lib/savedAnswers';

export function SettingsPage() {
  const { theme, setTheme, readingLevel, setReadingLevel, mode, connection } = useApp();
  const toast = useToast();
  const [savedCount, setSavedCount] = useState(() => listSavedAnswers().length);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-5 sm:px-6">
      <Panel padded>
        <SectionHeader
          eyebrow="Answers"
          title="Answer preferences"
          description="Applied to every question you ask from now on. Sent to the backend with the request."
        />
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-ink">Reading level</p>
          <SegmentedControl
            label="Default reading level"
            value={readingLevel}
            onChange={setReadingLevel}
            options={(['plain', 'standard', 'clinical'] as const).map((level) => ({
              value: level,
              label: READING_LEVEL_LABELS[level],
            }))}
          />
          <p className="text-xs leading-relaxed text-ink-muted">
            {READING_LEVEL_HINTS[readingLevel]}
          </p>
        </div>
      </Panel>

      <Panel padded>
        <SectionHeader eyebrow="Appearance" title="Theme" />
        <div className="mt-3 space-y-2">
          <SegmentedControl
            label="Theme"
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
          <p className="text-xs text-ink-muted">
            Stored in this browser. The first load follows your operating system setting.
          </p>
        </div>
      </Panel>

      <Panel padded>
        <SectionHeader
          eyebrow="Profile"
          title="Account"
          description="This build has no authentication. The frontend does not implement sign-in, and does not pretend to."
        />
        <IntegrationRequired
          className="mt-3"
          feature="User accounts and profile"
          detail="Authentication, profile data and per-user conversation history depend on backend auth that is not built yet. When it exists, this section will show the signed-in user and session controls. Nothing here is simulated in the meantime."
        />
      </Panel>

      <Panel padded>
        <SectionHeader
          eyebrow="Notifications"
          title="Notifications"
          description="Notification delivery depends on backend support, so these controls are disabled rather than fake."
        />
        <div className="mt-2 divide-y divide-line">
          <Toggle
            label="Email me when a document finishes indexing"
            description="Requires a notification service and a verified address."
            checked={false}
            onChange={() => undefined}
            disabled
            disabledReason="Unavailable until the backend exposes a notification endpoint."
          />
          <Toggle
            label="Alert me when a cited guideline is superseded"
            description="Requires document versioning in the ingestion pipeline."
            checked={false}
            onChange={() => undefined}
            disabled
            disabledReason="Unavailable until document versioning is implemented."
          />
        </div>
      </Panel>

      <Panel padded>
        <SectionHeader
          eyebrow="Data"
          title="Local data"
          description="Saved answers, preferences and demo conversations are stored in this browser only."
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface-sunken p-3">
          <div>
            <p className="text-sm font-medium text-ink">Saved answers</p>
            <p className="text-xs text-ink-muted">
              {savedCount} saved in this browser.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={savedCount === 0}
            onClick={() => {
              clearSavedAnswers();
              setSavedCount(0);
              toast.push({ tone: 'success', title: 'Saved answers cleared' });
            }}
          >
            Clear saved answers
          </Button>
        </div>
      </Panel>

      <Panel padded>
        <SectionHeader eyebrow="About" title="Build information" />
        <dl className="mt-3 divide-y divide-line text-sm">
          {[
            ['Application', appConfig.appName],
            ['Version', appConfig.buildVersion],
            ['Active mode', mode === 'demo' ? 'Demo' : 'Connected'],
            ['API base URL', appConfig.apiBaseUrl || 'not configured'],
            [
              'Backend status',
              mode === 'demo'
                ? 'Not applicable in Demo Mode'
                : connection.status === 'online'
                  ? 'Reachable'
                  : connection.status === 'checking'
                    ? 'Checking'
                    : 'Unreachable',
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-xs text-ink-muted">{label}</dt>
              <dd className="truncate font-mono text-xs text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <Badge tone="neutral">Frontend only</Badge>
          Retrieval, generation, document ingestion and storage are implemented by the backend
          and RAG services.
        </p>
      </Panel>
    </div>
  );
}
