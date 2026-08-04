import ClientPhoto from '../../src/models/ClientPhoto.js';
import Client from '../../src/models/Client.js';
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
    Client.findOne.mockReset();
    ClientPhoto.findOne.mockReset();
    ClientPhoto.update.mockReset();
    ClientPhoto.create.mockReset();
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

  it('nao atualiza nem cria foto quando a cliente nao pertence ao tenant', async () => {
    Client.findOne.mockResolvedValue(null);

    await expect(replaceClientPhoto({ userId: 8, clientId: 12, photo: normalizedPhoto }))
      .rejects.toMatchObject({ code: 'CLIENT_PHOTO_NOT_FOUND' });
    expect(Client.findOne).toHaveBeenCalledWith({ where: { id: 12, userId: 8 } });
    expect(ClientPhoto.update).not.toHaveBeenCalled();
    expect(ClientPhoto.create).not.toHaveBeenCalled();
  });

  it('atualiza uma foto existente apenas pela chave de tenant e cliente', async () => {
    Client.findOne.mockResolvedValue({ id: 12 });
    ClientPhoto.update.mockResolvedValue([1]);

    await replaceClientPhoto({ userId: 7, clientId: 12, photo: normalizedPhoto });

    expect(ClientPhoto.update).toHaveBeenCalledWith({
      data: normalizedPhoto.data,
      mimeType: normalizedPhoto.mimeType,
      byteSize: normalizedPhoto.byteSize,
      checksum: normalizedPhoto.checksum,
      width: normalizedPhoto.width,
      height: normalizedPhoto.height,
    }, {
      where: { userId: 7, clientId: 12 },
    });
    expect(ClientPhoto.create).not.toHaveBeenCalled();
  });

  it('cria foto somente depois de validar a propriedade e nao encontrar linha escopada', async () => {
    Client.findOne.mockResolvedValue({ id: 12 });
    ClientPhoto.update.mockResolvedValue([0]);
    ClientPhoto.create.mockResolvedValue({ id: 1 });

    await replaceClientPhoto({ userId: 7, clientId: 12, photo: normalizedPhoto });

    expect(ClientPhoto.create).toHaveBeenCalledWith({
      userId: 7,
      clientId: 12,
      ...normalizedPhoto,
    });
  });

  it('nao transfere foto de outro tenant quando create encontra conflito unico', async () => {
    const uniqueConflict = Object.assign(new Error('clientId already exists'), {
      name: 'SequelizeUniqueConstraintError',
    });
    Client.findOne.mockResolvedValue({ id: 12 });
    ClientPhoto.update.mockResolvedValueOnce([0]).mockResolvedValueOnce([0]);
    ClientPhoto.create.mockRejectedValue(uniqueConflict);

    await expect(replaceClientPhoto({ userId: 7, clientId: 12, photo: normalizedPhoto }))
      .rejects.toMatchObject({ code: 'CLIENT_PHOTO_REPLACE_FAILED' });

    expect(ClientPhoto.update).toHaveBeenCalledTimes(2);
    expect(ClientPhoto.update).toHaveBeenNthCalledWith(1, expect.any(Object), {
      where: { userId: 7, clientId: 12 },
    });
    expect(ClientPhoto.update).toHaveBeenNthCalledWith(2, expect.any(Object), {
      where: { userId: 7, clientId: 12 },
    });
    expect(ClientPhoto.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      clientId: 12,
    }));
  });

  it('remove somente a foto da cliente no tenant informado', async () => {
    ClientPhoto.destroy.mockResolvedValue(1);

    await expect(removeClientPhoto({ userId: 7, clientId: 12 })).resolves.toBe(1);
    expect(ClientPhoto.destroy).toHaveBeenCalledWith({ where: { userId: 7, clientId: 12 } });
  });
});
