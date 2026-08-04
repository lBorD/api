import {
  decodeHistoryCursor,
  encodeHistoryCursor,
} from '../../src/utils/clientHistoryCursor.js';

describe('clientHistoryCursor', () => {
  it('preserva data e id num cursor Base64URL opaco', () => {
    const cursor = encodeHistoryCursor({
      startAt: '2026-08-03T10:00:00.000Z',
      id: 42,
    });

    expect(cursor).not.toContain('+');
    expect(cursor).not.toContain('/');
    expect(decodeHistoryCursor(cursor)).toEqual({
      startAt: new Date('2026-08-03T10:00:00.000Z'),
      id: 42,
    });
  });

  it.each([
    '',
    '***',
    Buffer.from('{}').toString('base64url'),
    Buffer.from(JSON.stringify({ startAt: 'not-a-date', id: 42 })).toString('base64url'),
    Buffer.from(JSON.stringify({ startAt: 0, id: 42 })).toString('base64url'),
    Buffer.from(JSON.stringify({ startAt: '2026-08-03T10:00:00.000Z', id: 0 })).toString('base64url'),
  ])('rejeita cursor invalido %s', (cursor) => {
    expect(decodeHistoryCursor(cursor)).toBeNull();
  });
});
