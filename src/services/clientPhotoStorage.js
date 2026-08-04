import ClientPhoto from '../models/ClientPhoto.js';
import Client from '../models/Client.js';

const metadataAttributes = ['mimeType', 'byteSize', 'checksum', 'width', 'height', 'updatedAt'];
const photoAttributes = ['data', ...metadataAttributes];

const scopedWhere = ({ userId, clientId }) => ({ userId, clientId });

const photoPayload = ({ userId, clientId, photo }) => ({
  userId,
  clientId,
  data: photo.data,
  mimeType: photo.mimeType,
  byteSize: photo.byteSize,
  checksum: photo.checksum,
  width: photo.width,
  height: photo.height,
});

const errorWithCode = (code) => Object.assign(new Error(code), { code });
const affectedRows = (result) => (Array.isArray(result) ? result[0] : result);
const isUniqueConstraintError = (error) => error?.name === 'SequelizeUniqueConstraintError';

export const getClientPhotoMeta = ({ userId, clientId }) => ClientPhoto.findOne({
  attributes: metadataAttributes,
  where: scopedWhere({ userId, clientId }),
});

export const readClientPhoto = ({ userId, clientId }) => ClientPhoto.findOne({
  attributes: photoAttributes,
  where: scopedWhere({ userId, clientId }),
});

export const replaceClientPhoto = async ({ userId, clientId, photo }) => {
  const where = scopedWhere({ userId, clientId });
  const client = await Client.findOne({ where: { id: clientId, userId } });

  if (!client) {
    throw errorWithCode('CLIENT_PHOTO_NOT_FOUND');
  }

  const values = photoPayload({ userId, clientId, photo });
  const updated = await ClientPhoto.update({
    data: values.data,
    mimeType: values.mimeType,
    byteSize: values.byteSize,
    checksum: values.checksum,
    width: values.width,
    height: values.height,
  }, { where });

  if (affectedRows(updated) > 0) {
    return updated;
  }

  try {
    return await ClientPhoto.create(values);
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
  }

  const retriedUpdate = await ClientPhoto.update({
    data: values.data,
    mimeType: values.mimeType,
    byteSize: values.byteSize,
    checksum: values.checksum,
    width: values.width,
    height: values.height,
  }, { where });

  if (affectedRows(retriedUpdate) > 0) {
    return retriedUpdate;
  }

  throw errorWithCode('CLIENT_PHOTO_REPLACE_FAILED');
};

export const removeClientPhoto = ({ userId, clientId }) => ClientPhoto.destroy({
  where: scopedWhere({ userId, clientId }),
});
