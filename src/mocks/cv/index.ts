import type { HttpHandler } from 'msw';

import { aiHandlers } from './handlers/ai.handlers';
import { atsHandlers } from './handlers/ats.handlers';
import { cvHandlers } from './handlers/cv.handlers';
import { importHandlers } from './handlers/import.handlers';
import { profileHandlers } from './handlers/profile.handlers';
import { mockDb } from './db';
import { mockScenario, resetScenario, setScenario } from './scenarios';

/**
 * Every CV endpoint the mock backend answers.
 *
 * Order matters only within a group (MSW takes the first match), which is why
 * the more specific `/api/cvs/from-profile` sits inside cv.handlers.ts above
 * the `/api/cvs/:cvId` reads.
 */
export const cvMockHandlers: HttpHandler[] = [
    ...cvHandlers,
    ...profileHandlers,
    ...importHandlers,
    ...atsHandlers,
    ...aiHandlers,
];

/**
 * Development console helper. Attached only where mocks are already running, so
 * it can never exist in a production bundle — and deliberately NOT an endpoint:
 * a `/api/reset-all-data` route is one deployment mistake away from being real.
 *
 *   __elevatorMocks.scenario({ profile: 'missing' })   // survives a refresh
 *   __elevatorMocks.reset()                            // fixtures + scenario
 */
export function exposeMockDevtools(): void {
    (globalThis as Record<string, unknown>)['__elevatorMocks'] = {
        scenario: setScenario,
        current: () => ({ ...mockScenario }),
        reset: () => {
            mockDb.reset();
            resetScenario();
        },
        db: mockDb,
    };
}

export { mockDb, mockScenario, resetScenario, setScenario };
