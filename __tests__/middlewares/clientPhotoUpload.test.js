import express from 'express';
import request from 'supertest';
import clientPhotoUpload from '../../src/middlewares/clientPhotoUpload.js';

const app = express();
app.put('/photo', clientPhotoUpload, (req, res) => {
  res.status(200).json({ bufferLength: req.file.buffer.length });
});

describe('clientPhotoUpload', () => {
  it('rejeita upload sem o campo photo', async () => {
    await request(app)
      .put('/photo')
      .field('unexpected', 'value')
      .expect(400, { error: 'Envie uma única foto no campo photo.' });
  });

  it('rejeita campos extras e mais de um arquivo', async () => {
    await request(app)
      .put('/photo')
      .attach('photo', Buffer.from('one'), 'one.jpg')
      .attach('photo', Buffer.from('two'), 'two.jpg')
      .expect(400, { error: 'Envie uma única foto no campo photo.' });

    await request(app)
      .put('/photo')
      .field('caption', 'arquivo')
      .attach('photo', Buffer.from('one'), 'one.jpg')
      .expect(400, { error: 'Envie uma única foto no campo photo.' });
  });

  it('rejeita arquivo acima de 5 MiB sem expor o nome do arquivo', async () => {
    const filename = 'private-photo.jpg';
    const response = await request(app)
      .put('/photo')
      .attach('photo', Buffer.alloc(5 * 1024 * 1024 + 1), filename)
      .expect(413);

    expect(response.body).toEqual({ error: 'A foto deve ter no máximo 5 MiB.' });
    expect(JSON.stringify(response.body)).not.toContain(filename);
  });

  it('mantém o único arquivo válido no buffer da requisição', async () => {
    const photo = Buffer.from('valid-photo');

    await request(app)
      .put('/photo')
      .attach('photo', photo, 'photo.jpg')
      .expect(200, { bufferLength: photo.length });
  });
});
