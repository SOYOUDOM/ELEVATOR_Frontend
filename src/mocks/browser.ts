// The XHR interceptor must be imported first: Angular's HttpClient and the
// generated NSwag proxies both use XMLHttpRequest, which the service worker
// alone does not see.
import './xhr';

import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';
import { exposeMockDevtools } from './cv';

export const worker = setupWorker(...handlers);

// Console helpers for switching mock scenarios and resetting fixtures. This
// module is only ever imported when environment.useMocks is on, so nothing here
// can reach a production bundle.
exposeMockDevtools();
