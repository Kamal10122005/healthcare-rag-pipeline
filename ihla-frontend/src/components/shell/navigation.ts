import {
  BookOpen,
  FileText,
  Library,
  MessagesSquare,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the top bar under the page title. */
  blurb: string;
  group: 'work' | 'knowledge' | 'system';
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/assistant',
    label: 'Assistant',
    icon: MessagesSquare,
    blurb: 'Ask a health question and get an answer traced to its sources.',
    group: 'work',
  },
  {
    to: '/evidence',
    label: 'Evidence',
    icon: FileText,
    blurb: 'Inspect the passages behind each answer, passage by passage.',
    group: 'work',
  },
  {
    to: '/library',
    label: 'Document library',
    icon: Library,
    blurb: 'The documents the assistant is allowed to answer from.',
    group: 'knowledge',
  },
  {
    to: '/knowledge',
    label: 'Knowledge workspace',
    icon: BookOpen,
    blurb: 'Browse topics, starter questions and answers you have saved.',
    group: 'knowledge',
  },
  {
    to: '/safety',
    label: 'Safety & trust',
    icon: ShieldCheck,
    blurb: 'What this assistant does, what it refuses, and how it handles uncertainty.',
    group: 'system',
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: Settings,
    blurb: 'Answer preferences, appearance, data handling and build information.',
    group: 'system',
  },
];

export const GROUP_LABELS: Record<NavItem['group'], string> = {
  work: 'Ask',
  knowledge: 'Knowledge base',
  system: 'Trust & configuration',
};
