import ClientPhoto from '../models/ClientPhoto.js';
import Client from '../models/Client.js';
import sequelize from '../config/db.js';

const metadataAttributes = ['mimeType', 'byteSize', 'checksum', 'width', 'height', 'updatedAt'];
const photoAttributes = ['data', ...metadataAttributes];

const scopedWhere = ({ userId, clientId }) => ({ userId, clientId });
const withTransaction = (options, transaction) => (transaction ? { ...options, transaction } : options);
const lockUpdate = (transaction) => transaction.LOCK?.UPDATE || 'UPDATE';

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

export const getClientPhotoMeta = ({ userId, clientId, transaction } = {}) => ClientPhoto.findOne(
  withTransaction({
    attributes: metadataAttributes,
    where: scopedWhere({ userId, clientId }),
  }, transaction),
);

export const readClientPhoto = ({ userId, clientId }) => ClientPhoto.findOne({
  attributes: photoAttributes,
  where: scopedWhere({ userId, clientId }),
});

const findLockedOwnedClient = ({ userId, clientId, transaction }) => Client.findOne({
  where: { id: clientId, userId },
  lock: lockUpdate(transaction),
  transaction,
});

export const replaceClientPhoto = ({ userId, clientId, photo }) => sequelize.transaction(async (transaction) => {
  const where = scopedWhere({ userId, clientId });
  const client = await findLockedOwnedClient({ userId, clientId, transaction });

  if (!client) {
    throw errorWithCode('CLIENT_PHOTO_NOT_FOUND');
  }

  const values = photoPayload({ userId, clientId, photo });
  const updateValues = {
    data: values.data,
    mimeType: values.mimeType,
    byteSize: values.byteSize,
    checksum: values.checksum,
    width: values.width,
    height: values.height,
  };
  const updated = await ClientPhoto.update(updateValues, { where, transaction });

  if (affectedRows(updated) === 0) {
    try {
      await ClientPhoto.create(values, { transaction });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      // PostgreSQL aborta a transação após conflito único; o lock da cliente
      // já serializa criações legítimas, então não há retry seguro nesta callback.
      throw errorWithCode('CLIENT_PHOTO_REPLACE_FAILED');
    }
  }

  const metadata = await getClientPhotoMeta({ userId, clientId, transaction });
  if (!metadata) {
    throw errorWithCode('CLIENT_PHOTO_REPLACE_FAILED');
  }

  return metadata;
});

export const removeClientPhoto = ({ userId, clientId }) => sequelize.transaction(async (transaction) => {
  const client = await findLockedOwnedClient({ userId, clientId, transaction });
  if (!client) {
    throw errorWithCode('CLIENT_PHOTO_NOT_FOUND');
  }

  return ClientPhoto.destroy({
    where: scopedWhere({ userId, clientId }),
    transaction,
  });
});
