/**
 * Service resolution.
 *
 * `createService(mode)` is the ONLY place that decides which implementation
 * the app talks to. It is a pure switch on the requested mode:
 *
 *   demo      → DemoService      (local, no network, origin: 'demo')
 *   connected → ConnectedService (HTTP, origin: 'live')
 *
 * There is no third branch, and no error path that swaps one for the other.
 * If Connected Mode fails, the ConnectedService throws and the UI renders the
 * failure — mixing live and demonstration content in one view is the single
 * thing this architecture is designed to make impossible.
 */

import type { ServiceMode } from '@/types/models';
import type { HealthAssistantService } from './contracts';
import { ConnectedService } from './connected/connectedService';
import { DemoService } from './demo/demoService';

let demoSingleton: DemoService | null = null;

/** Demo state (conversations, uploads) must survive mode switches within a session. */
function getDemoService(): DemoService {
  if (!demoSingleton) demoSingleton = new DemoService();
  return demoSingleton;
}

export function createService(mode: ServiceMode): HealthAssistantService {
  return mode === 'connected' ? new ConnectedService() : getDemoService();
}

export type { HealthAssistantService } from './contracts';
export * from './contracts';
export { ServiceError, toServiceError, errorHeadline } from './errors';
