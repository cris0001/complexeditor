import { DOCUMENT_VERSION } from './index';

describe('schema', () => {
  it('exposes the current document version', () => {
    expect(DOCUMENT_VERSION).toBe(1);
  });
});
