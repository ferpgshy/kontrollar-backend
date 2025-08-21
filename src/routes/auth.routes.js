// routes/auth.routes.js
import bcrypt from 'bcryptjs';
import {
  createUser,
  getUserByEmailWithHash,
  getUserById
} from '../repositories/perfil.repository.js';

const SALT_ROUNDS = 10;

function splitFullName(full) {
  const parts = (full || '').trim().split(/\s+/);
  const nome = parts.shift() || '';
  const sobrenome = parts.length ? parts.join(' ') : '';
  return { nome, sobrenome };
}

export default async function authRoutes(api) {
  // Registro
  api.post('/auth/register', async (req, rep) => {
    try {
      const { nomeCompleto, email, senha } = req.body || {};
      if (!nomeCompleto || !email || !senha) {
        return rep.code(400).send({ error: 'nomeCompleto, email e senha são obrigatórios.' });
      }

      const existing = await getUserByEmailWithHash(email);
      if (existing) return rep.code(409).send({ error: 'E-mail já cadastrado.' });

      const { nome, sobrenome } = splitFullName(nomeCompleto);
      const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);

      const user = await createUser({
        nome, sobrenome, email,
        senha_hash,
        cargo: 'Usuário' // ajuste se quiser outro padrão
      });

      // não retornar hash
      delete user.senha_hash;
      rep.code(201).send(user);
    } catch (err) {
      req.log?.error?.(err);
      // violação de unicidade
      if (err.code === '23505') return rep.code(409).send({ error: 'E-mail já cadastrado.' });
      rep.code(500).send({ error: 'Erro ao registrar.' });
    }
  });

  // Login
  api.post('/auth/login', async (req, rep) => {
    try {
      const { email, senha } = req.body || {};
      if (!email || !senha) {
        return rep.code(400).send({ error: 'email e senha são obrigatórios.' });
      }

      const user = await getUserByEmailWithHash(email);
      if (!user) return rep.code(401).send({ error: 'Credenciais inválidas.' });

      const ok = await bcrypt.compare(senha, user.senha_hash || '');
      if (!ok) return rep.code(401).send({ error: 'Credenciais inválidas.' });

      // montar payload "seguro" pro frontend
      const safe = await getUserById(user.id);
      rep.send(safe);
    } catch (err) {
      req.log?.error?.(err);
      rep.code(500).send({ error: 'Erro ao autenticar.' });
    }
  });

  // Solicitar recuperação (stub)
  api.post('/auth/request-reset', async (req, rep) => {
    try {
      const { email } = req.body || {};
      if (!email) return rep.code(400).send({ error: 'email é obrigatório.' });

      // Aqui você dispararia um e-mail com token etc.
      // Neste momento só respondemos sucesso.
      rep.send({ message: 'Se existir uma conta com este e-mail, enviaremos instruções de recuperação.' });
    } catch (err) {
      req.log?.error?.(err);
      rep.code(500).send({ error: 'Erro ao solicitar recuperação.' });
    }
  });
}
