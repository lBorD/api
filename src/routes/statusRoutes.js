import { Router } from 'express';
import sequelize from '../config/db.js';
import { buildStatus, renderStatusPage } from '../services/statusReport.js';

const router = Router();

// Endpoint publico de diagnostico, pensado para ser aberto no navegador. O
// `/health` continua existindo e inalterado porque e ele que o UptimeRobot
// monitora - mudar o contrato dele derrubaria o monitoramento.
//
// Nada aqui pode vazar dado sensivel: o repositorio e publico e a rota nao tem
// autenticacao. Entao saem versao, tempo de atividade e se o banco responde -
// nunca host, credencial, variavel de ambiente ou dado de cliente.
router.get('/', async (req, res) => {
  const status = await buildStatus(sequelize);

  res.set('Cache-Control', 'no-store');
  const httpStatus = status.status === 'ok' ? 200 : 503;

  // O navegador pede text/html; qualquer outro cliente (curl, monitoramento, eu
  // mesmo conferindo deploy) recebe JSON.
  if (req.accepts(['json', 'html']) === 'html') {
    res.type('html');
    return res.status(httpStatus).send(renderStatusPage(status));
  }

  return res.status(httpStatus).json(status);
});

export default router;
