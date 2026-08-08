import { Injectable } from '@angular/core';
import { AbpHttpConfigurationService, IErrorInfo } from 'abp-ng2-module';

/**
 * ELEVATOR — ABP HTTP error presentation.
 *
 * ABP's interceptor pops a SweetAlert modal for every failed request. That is
 * the right default for a background call nobody was watching, and the wrong
 * one for a form the user is looking at: a light-themed modal lands on top of
 * the dark auth screen and hides the field the user has to fix.
 *
 * Subclassing AbpHttpConfigurationService is ABP's own extension point — the
 * methods exist to be overridden. `showError` is the only behaviour changed,
 * and only while a caller has explicitly claimed the error.
 *
 * Scope note: the flag is global for the moment it is set, so a *different*
 * request failing inside the same window would also lose its modal. That is
 * acceptable for a form that has one request in flight; anything with
 * concurrent traffic should key the suppression per request instead.
 */
@Injectable()
export class ElevatorHttpConfigurationService extends AbpHttpConfigurationService {
    private suppressDepth = 0;

    /** True while some caller is rendering the failure itself. */
    get isSuppressed(): boolean {
        return this.suppressDepth > 0;
    }

    /**
     * Claim the next failure. ALWAYS pair with release() in a finally/finalize
     * block, or every later error goes silent.
     */
    claim(): void {
        this.suppressDepth++;
    }

    release(): void {
        this.suppressDepth = Math.max(0, this.suppressDepth - 1);
    }

    override showError(error: IErrorInfo): any {
        if (this.isSuppressed) {
            // Still logged by the interceptor's logError() — only the modal
            // is dropped, never the diagnostic.
            return null;
        }
        return super.showError(error);
    }
}
