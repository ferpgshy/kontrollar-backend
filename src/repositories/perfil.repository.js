import pool from '../infra/db.js'

const SAFE_FIELDS = `
  id, nome, sobrenome, email, telefone, departamento, cargo, bio, avatar_base64,
  idade, cep, localidade, uf, bairro, logradouro, numero, created_at, updated_at
`;

const ALLOWED_UPDATE_FIELDS = [
  'nome','sobrenome','email','telefone','departamento','cargo','bio','avatar_base64',
  'idade','cep','localidade','uf','bairro','logradouro','numero'
];

export async function getAllUsers() {
  const { rows } = await pool.query(`SELECT ${SAFE_FIELDS} FROM users ORDER BY id`);
  return rows;
}

export async function getUserById(id) {
  const { rows } = await pool.query(`SELECT ${SAFE_FIELDS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

export async function getUserByEmailWithHash(email) {
  const { rows } = await pool.query(
    `SELECT id, nome, sobrenome, email, cargo, senha_hash
       FROM users
      WHERE LOWER(email) = LOWER($1)`,
    [email]
  );
  return rows[0] || null;
}

export async function getServerTime() {
  const result = await pool.query('SELECT NOW()');
  return result.rows[0].now;
}

export async function createUser(userData) {
  const {
    nome, sobrenome, email, telefone = null, departamento = null,
    cargo = 'client', bio = null, avatar_base64 = null,
    senha_hash, // obrigatória para criação
    idade = null, cep = null, localidade = null, uf = null,
    bairro = null, logradouro = null, numero = null,
  } = userData;

  const { rows } = await pool.query(
    `INSERT INTO users
      (nome, sobrenome, email, telefone, departamento, cargo, bio, avatar_base64,
       senha_hash, idade, cep, localidade, uf, bairro, logradouro, numero)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING ${SAFE_FIELDS}`,
    [nome, sobrenome, email, telefone, departamento, cargo, bio, avatar_base64,
     senha_hash, idade, cep, localidade, uf, bairro, logradouro, numero]
  );
  return rows[0];
}

export async function updateUser(id, data = {}) {
  // monta SET dinâmico só com campos enviados
  const entries = Object.entries(data).filter(([k, v]) =>
    ALLOWED_UPDATE_FIELDS.includes(k) && v !== undefined
  );

  if (entries.length === 0) {
    return await getUserById(id); // nada para atualizar; retorna o atual
  }

  const setChunks = entries.map(([k], idx) => `${k} = $${idx + 1}`);
  const values = entries.map(([, v]) => v);

  const { rows } = await pool.query(
    `UPDATE users SET ${setChunks.join(', ')} WHERE id = $${values.length + 1}
     RETURNING ${SAFE_FIELDS}`,
    [...values, id]
  );
  return rows[0] || null;
}

export async function updateUserPassword(id, senha_hash) {
  const { rows } = await pool.query(
    `UPDATE users SET senha_hash = $1 WHERE id = $2
     RETURNING id, email, updated_at`,
    [senha_hash, id]
  );
  return rows[0] || null;
}

export async function deleteUser(id) {
  const { rows } = await pool.query(
    `DELETE FROM users WHERE id = $1 RETURNING ${SAFE_FIELDS}`,
    [id]
  );
  return rows[0] || null;
}
