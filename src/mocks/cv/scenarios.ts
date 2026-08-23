/**
 * ELEVATOR — mock scenarios.
 *
 * ONE switchboard for how the fake backend behaves. Flip a value here (or from
 * the console via `__elevatorMocks.scenario`) and every handler follows —
 * nobody has to go and edit five handlers to see what a failed save looks like.
 */
export type ProfileScenario = 'existing' | 'missing' | 'error';
export type CvSaveScenario = 'success' | 'slow' | 'validation-error' | 'server-error';
export type ImportScenario = 'success' | 'slow' | 'failed' | 'unsupported';
export type AtsScenario = 'excellent' | 'average' | 'poor' | 'error';
export type AiScenario = 'success' | 'error';

export interface MockScenario {
    profile: ProfileScenario;
    cvSave: CvSaveScenario;
    import: ImportScenario;
    ats: AtsScenario;
    ai: AiScenario;
    /** Multiplies every mock delay. 0 makes the whole API instant for tests. */
    latency: number;
}

const DEFAULTS: MockScenario = {
    profile: 'existing',
    cvSave: 'success',
    import: 'success',
    ats: 'excellent',
    ai: 'success',
    latency: 1,
};

const STORAGE_KEY = 'elv-mock-scenario';

/**
 * Mutated in place so every handler reads the live object rather than a copy
 * captured at import time.
 */
export const mockScenario: MockScenario = { ...DEFAULTS, ...restore() };

export function setScenario(patch: Partial<MockScenario>): MockScenario {
    Object.assign(mockScenario, patch);
    persist();
    return mockScenario;
}

export function resetScenario(): MockScenario {
    Object.assign(mockScenario, DEFAULTS);
    persist();
    return mockScenario;
}

/**
 * Mirrored into sessionStorage alongside the mock database. Half the value of a
 * scenario switch is checking that the state survives a refresh — "set profile
 * to missing, reload, look at Get Started" has to mean what it says.
 */
function persist(): void {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mockScenario));
    } catch {
        /* private mode: the scenario just lasts for this page load */
    }
}

function restore(): Partial<MockScenario> {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Partial<MockScenario>) : {};
    } catch {
        return {};
    }
}
