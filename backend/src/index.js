import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import printersRouter from './routes/printers.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    snmpCommunity: process.env.SNMP_COMMUNITY || 'public',
    snmpTimeout: process.env.SNMP_TIMEOUT || '5000',
  });
});
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    snmpCommunity: process.env.SNMP_COMMUNITY || 'public',
    snmpTimeout: process.env.SNMP_TIMEOUT || '5000',
  });
});

app.use('/printers', printersRouter);
app.use('/api/printers', printersRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`SNMP Community: ${process.env.SNMP_COMMUNITY || 'public'}`);
});
