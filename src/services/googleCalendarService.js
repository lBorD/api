const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

const buildCalendarEventUrl = ({ calendarId, eventId = null }) => {
  const encodedCalendarId = encodeURIComponent(calendarId || 'primary');
  const baseUrl = `${GOOGLE_CALENDAR_API_BASE}/calendars/${encodedCalendarId}/events`;

  if (!eventId) {
    return `${baseUrl}?sendUpdates=none`;
  }

  return `${baseUrl}/${encodeURIComponent(eventId)}?sendUpdates=none`;
};

const parseGoogleResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
};

const requestGoogleCalendar = async ({ url, method, accessToken, body }) => {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parseGoogleResponse(response);

  if (!response.ok) {
    const message = data?.error?.message || data?.message || 'Falha na sincronizacao com Google Calendar.';
    throw new Error(message);
  }

  return data;
};

export const createGoogleCalendarEvent = async ({ accessToken, calendarId, event }) => (
  requestGoogleCalendar({
    url: buildCalendarEventUrl({ calendarId }),
    method: 'POST',
    accessToken,
    body: event,
  })
);

export const updateGoogleCalendarEvent = async ({ accessToken, calendarId, eventId, event }) => (
  requestGoogleCalendar({
    url: buildCalendarEventUrl({ calendarId, eventId }),
    method: 'PATCH',
    accessToken,
    body: event,
  })
);

export const deleteGoogleCalendarEvent = async ({ accessToken, calendarId, eventId }) => {
  const url = buildCalendarEventUrl({ calendarId, eventId });
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 404 || response.status === 410) {
    return true;
  }

  const data = await parseGoogleResponse(response);

  if (!response.ok) {
    const message = data?.error?.message || data?.message || 'Falha ao remover evento do Google Calendar.';
    throw new Error(message);
  }

  return true;
};
