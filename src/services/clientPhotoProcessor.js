import { createHash } from 'node:crypto';
import sharp from 'sharp';

sharp.block({ operation: ['VipsForeignLoadNsgif', 'VipsForeignLoadTiff', 'VipsForeignLoadVips'] });

const MAX_INPUT_PIXELS = 16_000_000;
const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 512 * 1024;
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

const invalidClientPhoto = () => {
  const error = new Error('INVALID_CLIENT_PHOTO');
  error.code = 'INVALID_CLIENT_PHOTO';
  return error;
};

export const processClientPhoto = async (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_INPUT_BYTES) {
    throw invalidClientPhoto();
  }

  try {
    const image = sharp(buffer, {
      failOn: 'error',
      limitInputPixels: MAX_INPUT_PIXELS,
    });
    const inputMetadata = await image.metadata();

    if (!ACCEPTED_FORMATS.has(inputMetadata.format)) {
      throw invalidClientPhoto();
    }

    const { data, info } = await image
      .rotate()
      .resize(512, 512, { fit: 'cover', position: 'centre' })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });

    if (data.length > MAX_OUTPUT_BYTES) {
      throw invalidClientPhoto();
    }

    return {
      data,
      mimeType: 'image/webp',
      byteSize: data.length,
      checksum: createHash('sha256').update(data).digest('hex'),
      width: info.width,
      height: info.height,
    };
  } catch (error) {
    if (error?.code === 'INVALID_CLIENT_PHOTO') {
      throw error;
    }

    throw invalidClientPhoto();
  }
};
