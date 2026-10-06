// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import assert from 'node:assert';

async function testResponses(fetch, prefix) {
  for (const [path, status] of [
    ['ok', 200],
    ['not-found', 404],
    ['redirect', 201],
    ['websocket', 101],
    ['rejected-websocket', 403],
  ]) {
    const response = await fetch(`http://example.com/${prefix}/${path}`, {
      headers: path.includes('websocket') ? { Upgrade: 'websocket' } : {},
    });
    assert.strictEqual(response.status, status);
    if (status === 101) {
      assert.ok(response.webSocket);
      const closed = new Promise((resolve) => {
        response.webSocket.addEventListener('close', () => {
          response.webSocket.close(1000);
          resolve();
        });
      });
      response.webSocket.accept();
      await closed;
    } else {
      await response.text();
    }
  }
}

export const globalFetch = {
  async test() {
    await testResponses(fetch, 'global');
  },
};

export const serviceFetch = {
  async test(ctrl, env) {
    await testResponses(env.SERVICE.fetch.bind(env.SERVICE), 'service');
  },
};

export default {
  fetch(request) {
    const url = new URL(request.url);
    switch (url.pathname.split('/').pop()) {
      case 'ok':
        return new Response('ok');
      case 'not-found':
        return new Response('not found', { status: 404 });
      case 'redirect':
        return Response.redirect(new URL('created', url), 302);
      case 'created':
        return new Response('created', { status: 201 });
      case 'websocket': {
        const [client, server] = Object.values(new WebSocketPair());
        server.accept();
        server.close(1000);
        return new Response(null, { status: 101, webSocket: client });
      }
      case 'rejected-websocket':
        return new Response('forbidden', { status: 403 });
      default:
        throw new Error(`Unexpected URL: ${request.url}`);
    }
  },
};
