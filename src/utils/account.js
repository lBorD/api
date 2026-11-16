export const ROLE_OWNER = 'owner';
export const ROLE_STAFF = 'staff';

export const isStaff = (user) => user?.role === ROLE_STAFF;

// O `id` do token e sempre o da conta dona dos dados: todo controller isola por
// `req.user.id`, entao a funcionaria enxerga a conta da dona sem mudar consulta.
// `actorId` e quem fez login, usado para registrar autoria.
export const buildTokenPayload = (user) => (
  isStaff(user)
    ? { id: user.accountOwnerId, actorId: user.id, role: ROLE_STAFF }
    : { id: user.id, actorId: user.id, role: ROLE_OWNER }
);

// Token emitido antes da equipe existir traz so `{ id }`: e da dona.
export const normalizeTokenUser = (payload = {}) => ({
  ...payload,
  actorId: payload.actorId ?? payload.id,
  role: payload.role ?? ROLE_OWNER,
});

export const getActorId = (req) => req.user?.actorId ?? req.user?.id ?? null;

export const getDisplayName = (user) => {
  if (!user) {
    return null;
  }

  const value = typeof user.get === 'function' ? user.get({ plain: true }) : user;
  return value.name || value.username || value.email || null;
};
