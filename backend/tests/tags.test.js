const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');
const { criarUsuarioEToken } = require('./helpers');

afterAll(async () => {
  await db.end();
});

async function criarLead(token, nome = 'Lead com tag') {
  const resposta = await request(app)
    .post('/api/leads')
    .set('Authorization', `Bearer ${token}`)
    .send({ nome });
  return resposta.body;
}

describe('Tags', () => {
  test('cria, lista e remove tag', async () => {
    const { token } = await criarUsuarioEToken(app, request);

    const criar = await request(app)
      .post('/api/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'VIP' });
    expect(criar.status).toBe(201);

    const listar = await request(app).get('/api/tags').set('Authorization', `Bearer ${token}`);
    expect(listar.body).toHaveLength(1);

    const remover = await request(app)
      .delete(`/api/tags/${criar.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(remover.status).toBe(204);
  });

  test('rejeita tag duplicada para o mesmo usuário', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    await request(app).post('/api/tags').set('Authorization', `Bearer ${token}`).send({ nome: 'Repetida' });

    const resposta = await request(app)
      .post('/api/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Repetida' });

    expect(resposta.status).toBe(409);
  });

  test('associa e desassocia tag de um lead', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);
    const tag = await request(app)
      .post('/api/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Urgente' });

    const associar = await request(app)
      .post(`/api/leads/${lead.id}/tags`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tagId: tag.body.id });
    expect(associar.status).toBe(201);

    const listarDoLead = await request(app)
      .get(`/api/leads/${lead.id}/tags`)
      .set('Authorization', `Bearer ${token}`);
    expect(listarDoLead.body).toHaveLength(1);
    expect(listarDoLead.body[0].nome).toBe('Urgente');

    const desassociar = await request(app)
      .delete(`/api/leads/${lead.id}/tags/${tag.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(desassociar.status).toBe(204);

    const listarDepois = await request(app)
      .get(`/api/leads/${lead.id}/tags`)
      .set('Authorization', `Bearer ${token}`);
    expect(listarDepois.body).toHaveLength(0);
  });

  test('remover lead remove a associação de tag (cascade)', async () => {
    const { token } = await criarUsuarioEToken(app, request);
    const lead = await criarLead(token);
    const tag = await request(app)
      .post('/api/tags')
      .set('Authorization', `Bearer ${token}`)
      .send({ nome: 'Cascata' });

    await request(app)
      .post(`/api/leads/${lead.id}/tags`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tagId: tag.body.id });

    const remover = await request(app)
      .delete(`/api/leads/${lead.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(remover.status).toBe(204);
  });
});
