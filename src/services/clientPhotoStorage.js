import ClientPhoto from '../models/ClientPhoto.js';

const metadataAttributes = ['mimeType', 'byteSize', 'checksum', 'width', 'height', 'updatedAt'];
const photoAttributes = ['data', ...metadataAttributes];

const scopedWhere = ({ userId, clientId }) => ({ userId, clientId });

export const getClientPhotoMeta = ({ userId, clientId }) => ClientPhoto.findOne({
  attributes: metadataAttributes,
  where: scopedWhere({ userId, clientId }),
});

export const readClientPhoto = ({ userId, clientId }) => ClientPhoto.findOne({
  attributes: photoAttributes,
  where: scopedWhere({ userId, clientId }),
});

export const replaceClientPhoto = ({ userId, clientId, photo }) => ClientPhoto.upsert({
  userId,
  clientId,
  data: photo.data,
  mimeType: photo.mimeType,
  byteSize: photo.byteSize,
  checksum: photo.checksum,
  width: photo.width,
  height: photo.height,
});

export const removeClientPhoto = ({ userId, clientId }) => ClientPhoto.destroy({
  where: scopedWhere({ userId, clientId }),
});
