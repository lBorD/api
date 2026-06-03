import request from 'supertest';
import express from 'express';
import googleCalendarIntegrationRoutes from '../../src/routes/googleCalendarIntegrationRoutes.js';

const app = express();
app.use(express.json());
app.use('/integrations/google-calendar', googleCalendarIntegrationRoutes);

const withAuth = (reqBuilder) => reqBuilder.set('Authorization', 'Bearer test-token');

describe('Google Calendar Integration Routes', () => {
  it('bloqueia status sem token', async () => {
    await request(app)
      .get('/integrations/google-calendar/status')
      .expect(401);
  });

  it('permite status com token', async () => {
    const response = await withAuth(request(app)
      .get('/integrations/google-calendar/status'))
      .expect(200);

    expect(response.body).toHaveProperty('connected', false);
  });
});
