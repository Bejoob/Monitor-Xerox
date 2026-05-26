# Monitor Xerox — Consumíveis via SNMP

Aplicação web para monitoramento de impressoras Xerox na rede local. O backend consulta os equipamentos via SNMP (Printer-MIB) e o frontend exibe consumíveis, bandejas e status em um dashboard responsivo.

## Stack

- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express
- **SNMP:** net-snmp
- **Persistência:** arquivo JSON (`backend/data/printers.json`)

## Pré-requisitos

- Node.js 18+
- Impressoras com SNMP habilitado na rede
- Community SNMP configurada (padrão: `public`)

## Instalação

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Configuração

Copie ou edite o arquivo `backend/.env`:

```env
PORT=3001
SNMP_COMMUNITY=public
SNMP_TIMEOUT=5000
```

| Variável         | Descrição                          |
|------------------|------------------------------------|
| `PORT`           | Porta do servidor Express          |
| `SNMP_COMMUNITY` | Community SNMP padrão              |
| `SNMP_TIMEOUT`   | Timeout da consulta SNMP (ms)      |

## Executar em desenvolvimento

Abra **dois terminais**:

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api

O Vite faz proxy de `/api` para o backend automaticamente.

## API

| Método | Endpoint                      | Descrição                    |
|--------|-------------------------------|------------------------------|
| GET    | `/api/printers`               | Lista impressoras            |
| POST   | `/api/printers`               | Cadastra impressora          |
| PUT    | `/api/printers/:id`           | Atualiza impressora          |
| DELETE | `/api/printers/:id`           | Remove impressora            |
| GET    | `/api/printers/:id/status`    | Status SNMP (online/offline) |
| GET    | `/api/printers/:id/supplies`  | Consumíveis e bandejas       |
| POST   | `/api/printers/:id/test`      | Testa conexão SNMP           |
| POST   | `/api/printers/:id/refresh`   | Atualiza status + consumíveis|

## OIDs utilizados (Printer-MIB)

- `prtMarkerSuppliesDescription` — 1.3.6.1.2.1.43.11.1.1.6
- `prtMarkerSuppliesMaxCapacity` — 1.3.6.1.2.1.43.11.1.1.8
- `prtMarkerSuppliesLevel` — 1.3.6.1.2.1.43.11.1.1.9
- `prtInputDescription` — 1.3.6.1.2.1.43.8.2.1.18
- `prtInputMaxCapacity` — 1.3.6.1.2.1.43.8.2.1.9
- `prtInputCurrentLevel` — 1.3.6.1.2.1.43.8.2.1.10
- (Xerox) percentual de papel — 1.3.6.1.2.1.43.8.2.1.20 quando o nível SNMP é `-3`

**Cálculo de porcentagem:** `level / maxCapacity * 100`. Valores inválidos retornam *"Não informado pelo equipamento"*.

## Alertas visuais

| Cor     | Condição              |
|---------|------------------------|
| Verde   | Acima de 50%           |
| Amarelo | Entre 20% e 50%        |
| Vermelho| Abaixo de 20%          |
| Cinza   | Informação indisponível|

## Funcionalidades

- Dashboard com cards, busca e filtros (status / localização)
- Cadastro de impressoras (monocromática ou colorida)
- Teste de conexão SNMP
- Atualização manual e automática a cada 5 minutos
- Página de detalhes com consumíveis e bandejas
- Tratamento de erros: IP inacessível, timeout, community incorreta, OID não suportado

## Observações

- Toda consulta SNMP é feita **apenas pelo backend** (nunca pelo navegador).
- Modelos Xerox podem expor descrições de suprimentos com nomes diferentes; o sistema tenta mapear automaticamente por palavras-chave.
- Se um consumível não existir no equipamento, será exibido *"Não informado pelo equipamento"*.


## Iniciar e parar no PowerShell (Windows)

No PowerShell, use `npm.cmd` (em vez de `npm`) para evitar bloqueio de `npm.ps1`.

### Iniciar

Abra **dois terminais**:

```powershell
# Terminal 1 - Backend
cd "C:\Users\benilson\Desktop\Projetos JS\Impressoras\backend"
npm.cmd run dev
```

```powershell
# Terminal 2 - Frontend
cd "C:\Users\benilson\Desktop\Projetos JS\Impressoras\frontend"
npm.cmd run dev
```

- Frontend (web): `http://localhost:5173`
- Backend (API): `http://localhost:3001/api`
- Healthcheck: `http://localhost:3001/api/health`

### Parar sem erro

1. No terminal do frontend, pressione `Ctrl + C`.
2. No terminal do backend, pressione `Ctrl + C`.
3. Aguarde os dois voltarem para o prompt (`PS ...>`), então feche o Cursor.

Se travar e não encerrar com `Ctrl + C`:

```powershell
# Descobrir processo na porta do frontend
netstat -ano | findstr ":5173"
Stop-Process -Id PID_AQUI -Force

# Descobrir processo na porta do backend
netstat -ano | findstr ":3001"
Stop-Process -Id PID_AQUI -Force
```