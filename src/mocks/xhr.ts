import { getResponse } from 'msw';
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest';
import { handlers } from './handlers';

const interceptor = new XMLHttpRequestInterceptor();

interceptor.on('request', async ({ request, controller }) => {
  const response = await getResponse(handlers, request);
  if (response) {
    controller.respondWith(response);
  }
});

interceptor.apply();