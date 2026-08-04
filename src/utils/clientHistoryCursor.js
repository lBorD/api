export const encodeHistoryCursor = ({ startAt, id }) => Buffer
  .from(JSON.stringify({ startAt: new Date(startAt).toISOString(), id }))
  .toString('base64url');

export const decodeHistoryCursor = (cursor) => {
  if (typeof cursor !== 'string' || !cursor) {
    return null;
  }

  try {
    const { startAt, id } = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    const parsedStartAt = new Date(startAt);

    if (
      typeof startAt !== 'string'
      || Number.isNaN(parsedStartAt.getTime())
      || !Number.isInteger(id)
      || id <= 0
    ) {
      return null;
    }

    return { startAt: parsedStartAt, id };
  } catch {
    return null;
  }
};
