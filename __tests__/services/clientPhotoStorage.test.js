import ClientPhoto from '../../src/models/ClientPhoto.js';
import {
  getClientPhotoMeta,
  readClientPhoto,
  replaceClientPhoto,
  removeClientPhoto,
} from '../../src/services/clientPhotoStorage.js';

const normalizedPhoto = {
  data: Buffer.from('normalized-webp'),
  mimeType: 'image/webp',
  byteSize: 15,
  checksum: 'a'.repeat(64),
  width: 512,
  height: 512,
};

describe('clientPhotoStorage', () => {
  beforeEach(() => {
    ClientPhoto.findOne.mockReset();
    ClientPhoto.upsert.mockReset();
    ClientPhoto.destroy.mockReset();
  });

  it('busca somente metadados ao consultar a foto da cliente', async () => {
    const metadata = { ...normalizedPhoto, data: undefined };
    ClientPhoto.findOne.mockResolvedValue(metadata);

    await expect(getClientPhotoMeta({ userId: 7, clientId: 12 })).resolves.toBe(metadata);
    expect(ClientPhoto.findOne).toHaveBeenCalledWith({
      attributes: ['mimeType', 'byteSize', 'checksum', 'width', 'height', 'updatedAt'],
      where: { userId: 7, clientId: 12 },
    });
  });

  it('nao le foto de outro tenant', async () => {
    ClientPhoto.findOne.mockResolvedValue(null);

    await expect(readClientPhoto({ userId: 8, clientId: 12 })).resolves.toBeNull();
    expect(ClientPhoto.findOne).toHaveBeenCalledWith({
      attributes: ['data', 'mimeType', 'byteSize', 'checksum', 'width', 'height', 'updatedAt'],
      where: { userId: 8, clientId: 12 },
    });
  });

  it('faz upsert com dados normalizados e chave de tenant e cliente', async () => {
    await replaceClientPhoto({ userId: 7, clientId: 12, photo: normalizedPhoto });

    expect(ClientPhoto.upsert).toHaveBeenCalledWith({
      userId: 7,
      clientId: 12,
      ...normalizedPhoto,
    });
  });

  it('remove somente a foto da cliente no tenant informado', async () => {
    ClientPhoto.destroy.mockResolvedValue(1);

    await expect(removeClientPhoto({ userId: 7, clientId: 12 })).resolves.toBe(1);
    expect(ClientPhoto.destroy).toHaveBeenCalledWith({ where: { userId: 7, clientId: 12 } });
  });
});
