import './xhr';                       // XHR interceptor, see step 10
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);