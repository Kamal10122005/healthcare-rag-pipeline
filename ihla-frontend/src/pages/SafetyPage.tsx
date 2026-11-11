import { AlertTriangle, Ban, Eye, Lock, ShieldAlert, Stethoscope } from 'lucide-react';
import { Panel, SectionHeader } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Disclosure } from '@/components/ui/Tabs';
import { ConfidenceIndicator } from '@/components/assistant/ConfidenceIndicator';
import { appConfig } from '@/config/env';
import { useApp } from '@/state/AppProvider';

/**
 * Safety & trust centre.
 *
 * Collects, in one readable place, the commitments the product makes and the
 * states it can show — including live examples of the uncertainty indicator,
 * so a reviewer can see what "insufficient evidence" actually looks like.
 */
export function SafetyPage() {
  const { mode } = useApp();

  return (
    <div className="mx-auto w-full max-w-content space-y-5 px-4 py-5 sm:px-6">
      <Panel padded className="border-danger-border bg-danger-soft">
        <div className="flex gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
          <div className="space-y-1">
            <h2 className="text-md font-semibold text-danger">In an emergency, do not use this assistant</h2>
            <p className="max-w-prose text-sm leading-relaxed text-ink">
              Chest pain or pressure, severe breathlessness, face or limb weakness, slurred
              speech, a seizure, uncontrolled bleeding, a sudden severe headache, or a child who
              is hard to wake — contact emergency services immediately on{' '}
              <strong>{appConfig.emergencyNumber}</strong> or your local emergency number.
            </p>
            <p className="max-w-prose text-sm leading-relaxed text-ink">
              A safety layer is designed to intercept questions like these and refuse to answer
              them, because a typed description cannot be triaged safely. That interception runs
              in the answering service, not in this interface — so treat it as a backstop, never
              as something to rely on. If you think the situation may be an emergency, stop
              reading and call.
            </p>
          </div>
        </div>
      </Panel>

      <Panel padded>
        <SectionHeader
          eyebrow="Scope"
          title="What this product is, and what it is not"
          description="The distinction between information and medical care is the core design constraint, not a disclaimer bolted on at the end."
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-success-border bg-success-soft p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.04em] text-success">
              <Eye className="h-3.5 w-3.5" aria-hidden />
              It does
            </p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink">
              <li>Explain what trusted documents say, in plain language.</li>
              <li>Show the exact passage behind each statement.</li>
              <li>State plainly when the sources do not cover a question.</li>
              <li>Flag questions that need urgent in-person care.</li>
            </ul>
          </div>
          <div className="rounded-lg border border-danger-border bg-danger-soft p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.04em] text-danger">
              <Ban className="h-3.5 w-3.5" aria-hidden />
              It does not
            </p>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ink">
              <li>Diagnose a condition or interpret your personal test results.</li>
              <li>Recommend, start, stop or adjust any treatment or medicine.</li>
              <li>Triage symptoms or judge how urgent your situation is.</li>
              <li>Replace a clinician who knows your history.</li>
            </ul>
          </div>
        </div>
      </Panel>

      <Panel padded>
        <SectionHeader
          eyebrow="Uncertainty"
          title="How the assistant expresses what it does not know"
          description="Every answer carries an evidence indicator. These are the four states it can take."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ConfidenceIndicator confidence="high" citationCount={3} />
          <ConfidenceIndicator confidence="moderate" citationCount={2} />
          <ConfidenceIndicator confidence="low" citationCount={1} />
          <ConfidenceIndicator confidence="insufficient" citationCount={0} />
        </div>
        <p className="mt-3 max-w-prose text-xs leading-relaxed text-ink-muted">
          The indicator describes how well the retrieved passages support the answer. It is not a
          probability that the answer is medically correct, and it is deliberately not shown as a
          percentage.
        </p>
      </Panel>

      <Panel padded>
        <SectionHeader
          eyebrow="Limits"
          title="Known limitations of this system"
          description="A retrieval-augmented assistant fails in specific, predictable ways. These are the ones that matter here."
        />
        <div className="mt-3">
          <Disclosure summary="It can only answer from its indexed documents" defaultOpen>
            If a topic is not in the Document library, the assistant has nothing to answer from
            and will say so. An empty answer reflects the corpus, never the state of medical
            knowledge.
          </Disclosure>
          <Disclosure summary="Retrieval can surface the wrong passage">
            Passages are selected by semantic similarity. A passage can be topically close but
            answer a different question — which is exactly why every claim is shown with the text
            it came from, so you can check the match yourself.
          </Disclosure>
          <Disclosure summary="Documents go out of date">
            Guidance changes. Each source shows its publication date, and an answer built on an
            older document is only as current as that document.
          </Disclosure>
          <Disclosure summary="Generated text can still misread a source">
            Summarising a passage can lose a qualifier or a threshold. Where a number or a
            condition matters to you, read the source excerpt rather than the summary.
          </Disclosure>
          <Disclosure summary="It knows nothing about you">
            There is no access to your records, history, medicines or allergies, so no answer can
            account for them. That is what makes a clinician's judgement irreplaceable here.
          </Disclosure>
        </div>
      </Panel>

      <Panel padded>
        <SectionHeader
          eyebrow="Data"
          title="Privacy and data handling"
          actions={
            <Badge tone={mode === 'demo' ? 'demo' : 'success'}>
              {mode === 'demo' ? 'Demo mode' : 'Connected mode'}
            </Badge>
          }
        />
        <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-ink-muted">
          <li className="flex gap-2">
            <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
            <span>
              <strong className="text-ink">In Demo Mode</strong>, nothing leaves the browser. No
              question is transmitted, and conversations are kept in this browser's local
              storage only.
            </span>
          </li>
          <li className="flex gap-2">
            <Lock className="mt-px h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
            <span>
              <strong className="text-ink">In Connected Mode</strong>, questions are sent to the
              configured backend for retrieval and generation. What that backend stores, and for
              how long, is determined by the backend team — the frontend cannot assert it here,
              and this page will be updated when that policy is defined.
            </span>
          </li>
          <li className="flex gap-2">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
            <span>
              Avoid entering details that identify you or anyone else. The assistant does not
              need them to explain what a guideline says.
            </span>
          </li>
          <li className="flex gap-2">
            <Stethoscope className="mt-px h-3.5 w-3.5 shrink-0 text-ink-subtle" aria-hidden />
            <span>
              Saved answers and preferences live in this browser only and are cleared with site
              data.
            </span>
          </li>
        </ul>
      </Panel>
    </div>
  );
}
