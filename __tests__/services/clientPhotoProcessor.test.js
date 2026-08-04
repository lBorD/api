import sharp from 'sharp';
import { randomBytes } from 'node:crypto';
import { processClientPhoto } from '../../src/services/clientPhotoProcessor.js';

const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);
const corruptBuffer = Buffer.from('not-an-image');
const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');

describe('processClientPhoto', () => {
  it('orienta, recorta e converte uma entrada PNG valida para WebP 512 sem metadados', async () => {
    const result = await processClientPhoto(validPngBuffer);
    const metadata = await sharp(result.data).metadata();

    expect(result).toEqual(expect.objectContaining({
      mimeType: 'image/webp',
      width: 512,
      height: 512,
      checksum: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    expect(result.byteSize).toBe(result.data.length);
    expect(result.byteSize).toBeLessThanOrEqual(512 * 1024);
    expect(metadata.exif).toBeUndefined();
  });

  it.each([corruptBuffer, svgBuffer])('rejeita conteudo que nao e JPEG, PNG ou WebP reais', async (buffer) => {
    await expect(processClientPhoto(buffer)).rejects.toMatchObject({ code: 'INVALID_CLIENT_PHOTO' });
  });

  it.each([
    ['JPEG', () => sharp({ create: { width: 16, height: 8, channels: 3, background: 'red' } }).jpeg().toBuffer()],
    ['WebP', () => sharp({ create: { width: 16, height: 8, channels: 3, background: 'blue' } }).webp().toBuffer()],
  ])('aceita bytes reais de %s', async (_format, buildBuffer) => {
    const result = await processClientPhoto(await buildBuffer());

    expect(result).toEqual(expect.objectContaining({
      mimeType: 'image/webp',
      width: 512,
      height: 512,
    }));
  });

  it('aplica orientacao EXIF antes do crop central', async () => {
    const redCorner = await sharp({
      create: { width: 128, height: 128, channels: 3, background: 'red' },
    }).png().toBuffer();
    const orientedJpeg = await sharp({
      create: { width: 512, height: 512, channels: 3, background: 'blue' },
    }).composite([{ input: redCorner, left: 0, top: 0 }]).withMetadata({ orientation: 6 }).jpeg().toBuffer();

    const result = await processClientPhoto(orientedJpeg);
    const { data, info } = await sharp(result.data).raw().toBuffer({ resolveWithObject: true });
    const pixel = (x, y) => data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3);

    expect(pixel(448, 64)[0]).toBeGreaterThan(pixel(448, 64)[2]);
    expect(pixel(64, 64)[2]).toBeGreaterThan(pixel(64, 64)[0]);
  });

  it('rejeita uma imagem acima de 16 megapixels', async () => {
    const oversizedPng = await sharp({
      create: { width: 4001, height: 4000, channels: 3, background: 'white' },
    }).png().toBuffer();

    await expect(processClientPhoto(oversizedPng)).rejects.toMatchObject({ code: 'INVALID_CLIENT_PHOTO' });
  });

  it('rejeita uma imagem valida acima de 5 MiB', async () => {
    const oversizedPng = await sharp(randomBytes(2048 * 2048 * 3), {
      raw: { width: 2048, height: 2048, channels: 3 },
    }).png().toBuffer();

    expect(oversizedPng.length).toBeGreaterThan(5 * 1024 * 1024);
    await expect(processClientPhoto(oversizedPng)).rejects.toMatchObject({ code: 'INVALID_CLIENT_PHOTO' });
  });
});
