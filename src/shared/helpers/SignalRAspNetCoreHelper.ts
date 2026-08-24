import { AppConsts } from '@shared/AppConsts';
import { UtilsService } from 'abp-ng2-module';

/**
 * ELEVATOR — SignalR, loaded only when it is actually used.
 *
 * initSignalR() runs from AppComponent only when the app is talking to a real
 * backend (`!useMocks` and a resolved application). The @microsoft/signalr
 * bundle was nevertheless in the global `scripts` array, so every visitor
 * downloaded and parsed 48 kB of it on first paint — including every mocked dev
 * session, which can never use it.
 *
 * It now loads on demand, immediately before the ABP client that depends on it,
 * using the same dynamic-script approach this file already used.
 */
export class SignalRAspNetCoreHelper {
    private static libraryPromise?: Promise<void>;

    /** Idempotent; later callers share the first load. */
    private static loadLibrary(): Promise<void> {
        if (!SignalRAspNetCoreHelper.libraryPromise) {
            SignalRAspNetCoreHelper.libraryPromise = new Promise<void>((resolve, reject) => {
                const script = document.createElement('script');
                script.src = AppConsts.appBaseUrl + '/assets/signalr/signalr.min.js';
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Could not load the SignalR client library.'));
                document.head.appendChild(script);
            });
        }
        return SignalRAspNetCoreHelper.libraryPromise;
    }

    static initSignalR(callback?: () => void): void {
        const encryptedAuthToken = new UtilsService().getCookieValue(AppConsts.authorization.encryptedAuthTokenName);

        abp.signalr = {
            autoConnect: true,
            connect: undefined,
            hubs: undefined,
            qs: AppConsts.authorization.encryptedAuthTokenName + '=' + encodeURIComponent(encryptedAuthToken),
            remoteServiceBaseUrl: AppConsts.remoteServiceBaseUrl,
            startConnection: undefined,
            url: '/signalr',
            withUrlOptions: {},
        };

        // The ABP client expects window.signalR to exist already.
        void SignalRAspNetCoreHelper.loadLibrary().then(() => {
            const script = document.createElement('script');
            if (callback) {
                script.onload = () => callback();
            }
            script.src = AppConsts.appBaseUrl + '/assets/abp/abp.signalr-client.js';
            document.head.appendChild(script);
        });
    }
}
