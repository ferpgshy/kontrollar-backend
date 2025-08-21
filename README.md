<h1 align="center">🧠 Kontrollar — Backend</h1>
<p align="center">API em Node.js para a intranet Kontrollar.</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=flat-square" />
  <img src="https://img.shields.io/badge/backend-Fastify%20%7C%20PostgreSQL-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/license-Custom-lightgrey?style=flat-square" />
</p>

## 🚀 Sobre

API REST do Kontrollar para autenticação e perfil de usuários (nome, sobrenome, email, telefone, departamento, **cargo em PT-BR**, bio e **avatar em base64**).

---

## 🧱 Tecnologias

* **Node.js** + **Fastify**
* **PostgreSQL** (`pg`)
* **bcryptjs**, **dotenv**
* ESM (import/export)

---

## 🔧 Requisitos

* Node 18+
* PostgreSQL 13+

---

## 📦 Instalação

```bash
git clone <seu-repo-backend>.git
cd kontrollar-backend
npm i
cp .env.example .env   # edite as variáveis
```

> Estrutura de instalação baseada no formato do README principal.&#x20;

### `.env` (exemplo)

```
PORT=3000
DATABASE_URL=postgres://usuario:senha@localhost:5432/kontrollar
```

---

## 🗄️ Banco de Dados (SQL rápido)

```sql
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  sobrenome VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  telefone VARCHAR(20),
  departamento VARCHAR(60),
  cargo VARCHAR(20) NOT NULL DEFAULT 'Cliente',
  bio TEXT,
  avatar_base64 TEXT,
  senha_hash TEXT NOT NULL,
  idade INTEGER,
  cep VARCHAR(9),
  localidade VARCHAR(100),
  uf CHAR(2),
  bairro VARCHAR(60),
  logradouro VARCHAR(100),
  numero VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cargo_valid CHECK (cargo IN ('Administrador','Gestor','Desenvolvedor','Cliente','Usuário')),
  CONSTRAINT uf_valid CHECK (uf IS NULL OR uf ~ '^[A-Z]{2}$')
);

-- email único (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));

-- trigger updated_at
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_updated_at ON users;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
```

---

## ▶️ Rodando

```bash
# desenvolvimento
npm run dev

# produção
npm start
```

Servidor: `http://127.0.0.1:3000`

---

## 🔌 Endpoints

### Auth

* `POST /auth/register` — cria usuário (hash de senha no servidor)
* `POST /auth/login` — autentica e retorna usuário “safe”
* `POST /auth/request-reset` — solicita recuperação (stub)

### Users

* `GET /users` — lista
* `GET /users/:id` — detalha
* `POST /users` — cria (uso interno)
* `PUT /users/:id` — atualiza perfil (nome/sobrenome/email/telefone/departamento/cargo/bio/avatar\_base64…)
* `DELETE /users/:id` — remove