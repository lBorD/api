import request from 'supertest';
import express from 'express';
import TeamController from '../../src/controllers/team.js';
import User from '../../src/models/User.js';

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.user = { id: 1, actorId: 1, role: 'owner' };
  next();
});

app.get('/team/members', TeamController.listMembers);
app.post('/team/members', TeamController.createMember);
app.patch('/team/members/:id', TeamController.updateMember);

const buildMember = (overrides = {}) => {
  const member = {
    id: 7,
    name: 'Maria',
    email: 'maria@estudio.com',
    active: true,
    role: 'staff',
    accountOwnerId: 1,
    createdAt: new Date('2026-11-16T12:00:00.000Z'),
    ...overrides,
  };
  member.update = jest.fn(async (values) => Object.assign(member, values));
  return member;
};

describe('TeamController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lista so as funcionarias da conta da dona, sem expor senha', async () => {
    User.findAll.mockResolvedValue([buildMember({ password: 'hash' })]);

    const response = await request(app)
      .get('/team/members')
      .expect(200);

    expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { accountOwnerId: 1, role: 'staff' },
    }));
    expect(response.body).toEqual([{
      id: 7,
      name: 'Maria',
      email: 'maria@estudio.com',
      active: true,
      createdAt: '2026-11-16T12:00:00.000Z',
    }]);
  });

  it('cadastra funcionaria vinculada a conta da dona', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockImplementation(async (values) => buildMember(values));

    const response = await request(app)
      .post('/team/members')
      .send({ name: ' Maria ', email: ' maria@estudio.com ', password: 'senha123' })
      .expect(201);

    expect(User.create).toHaveBeenCalledWith({
      username: 'maria@estudio.com',
      email: 'maria@estudio.com',
      password: 'senha123',
      name: 'Maria',
      role: 'staff',
      accountOwnerId: 1,
      active: true,
    });
    expect(response.body).not.toHaveProperty('password');
    expect(response.body.email).toBe('maria@estudio.com');
  });

  it('recusa e-mail ja usado por outra conta', async () => {
    User.findOne.mockResolvedValue({ id: 3 });

    await request(app)
      .post('/team/members')
      .send({ name: 'Maria', email: 'maria@estudio.com', password: 'senha123' })
      .expect(409);

    expect(User.create).not.toHaveBeenCalled();
  });

  it.each([
    [{ email: 'maria@estudio.com', password: 'senha123' }],
    [{ name: 'Maria', email: 'invalido', password: 'senha123' }],
    [{ name: 'Maria', email: 'maria@estudio.com', password: '123' }],
  ])('recusa cadastro invalido %j', async (body) => {
    await request(app)
      .post('/team/members')
      .send(body)
      .expect(400);

    expect(User.create).not.toHaveBeenCalled();
  });

  it('desativa funcionaria da propria conta', async () => {
    const member = buildMember();
    User.findOne.mockResolvedValue(member);

    const response = await request(app)
      .patch('/team/members/7')
      .send({ active: false })
      .expect(200);

    expect(User.findOne).toHaveBeenCalledWith({
      where: { id: '7', accountOwnerId: 1, role: 'staff' },
    });
    expect(member.update).toHaveBeenCalledWith({ active: false });
    expect(response.body.active).toBe(false);
  });

  it('redefine a senha pela instancia, para o hook gerar o hash', async () => {
    const member = buildMember();
    User.findOne.mockResolvedValue(member);

    await request(app)
      .patch('/team/members/7')
      .send({ password: 'novaSenha' })
      .expect(200);

    expect(member.update).toHaveBeenCalledWith({ password: 'novaSenha' });
  });

  it('nao encontra funcionaria de outra conta', async () => {
    User.findOne.mockResolvedValue(null);

    await request(app)
      .patch('/team/members/99')
      .send({ active: false })
      .expect(404);
  });
});
