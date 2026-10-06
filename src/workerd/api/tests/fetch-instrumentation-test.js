// Copyright (c) 2026 Cloudflare, Inc.
// Licensed under the Apache 2.0 license found in the LICENSE file or at:
//     https://opensource.org/licenses/Apache-2.0

import assert from 'node:assert';
import {
  testTailHandler,
  spans,
  invocationPromises,
} from 'test:instrumentation-tail';

export default testTailHandler;

export const responseStatus = {
  async test() {
    await Promise.all(invocationPromises);

    const fetchSpans = Array.from(spans.values()).filter(
      (span) => span.name === 'fetch'
    );
    assert.strictEqual(fetchSpans.length, 12);

    for (const prefix of ['global', 'service']) {
      for (const [path, status] of [
        ['ok', 200n],
        ['not-found', 404n],
        ['redirect', 302n],
        ['created', 201n],
        ['websocket', 101n],
        ['rejected-websocket', 403n],
      ]) {
        const url = `http://example.com/${prefix}/${path}`;
        const matchingSpans = fetchSpans.filter(
          (span) => span['url.full'] === url
        );
        assert.strictEqual(matchingSpans.length, 1, url);
        const [span] = matchingSpans;
        assert.strictEqual(span['http.response.status_code'], status, url);
        assert.strictEqual(span.closed, true, url);
      }
    }
  },
};
