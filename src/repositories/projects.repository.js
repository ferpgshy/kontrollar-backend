// repositories/projects.repository.js
import pool from '../infra/db.js';

// >>> Deixe TODAS as colunas qualificadas com "p."
const PROJECT_FIELDS = `
  p.id AS id,
  p.name AS name,
  p.description AS description,
  p.status AS status,
  p.priority AS priority,
  p.progress_pct AS progress_pct,
  p.deadline AS deadline,
  p.manager_id AS manager_id,
  p.created_at AS created_at,
  p.updated_at AS updated_at
`;

// Opções fixas (se tiver /options no backend, pode manter)
export async function listStatusOptions() {
  return ['Planejamento','Em Andamento','Em Desenvolvimento','Quase Concluído','Concluído'];
}
export async function listPriorityOptions() {
  return ['Baixa','Média','Alta'];
}

export async function getProjects({ limit = 50, offset = 0 } = {}) {
  const { rows } = await pool.query(
    `SELECT ${PROJECT_FIELDS},
            (u.nome || ' ' || u.sobrenome) AS manager_name
       FROM projects p
       JOIN users u ON u.id = p.manager_id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return rows;
}

export async function getProjectById(id) {
  const { rows } = await pool.query(
    `SELECT ${PROJECT_FIELDS},
            (u.nome || ' ' || u.sobrenome) AS manager_name
       FROM projects p
       JOIN users u ON u.id = p.manager_id
      WHERE p.id = $1`,
    [id]
  );
  const project = rows[0];
  if (!project) return null;

  const members = await getMembers(id);
  return { ...project, members };
}

export async function createProject(data) {
  const {
    name, description = null,
    status = 'Planejamento',
    priority = 'Média',
    progress_pct = 0,
    deadline = null,
    manager_id,
  } = data;

  const allowedStatus = await listStatusOptions();
  const allowedPriority = await listPriorityOptions();
  if (!allowedStatus.includes(status)) throw new Error('Status inválido');
  if (!allowedPriority.includes(priority)) throw new Error('Prioridade inválida');

  const { rows } = await pool.query(
    `INSERT INTO projects
      (name, description, status, priority, progress_pct, deadline, manager_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, name, description, status, priority, progress_pct, deadline, manager_id, created_at, updated_at`,
    [name, description, status, priority, progress_pct, deadline, manager_id]
  );
  return rows[0];
}

export async function updateProject(id, data = {}) {
  const allowed = ['name','description','status','priority','progress_pct','deadline','manager_id'];
  const entries = Object.entries(data).filter(([k, v]) => allowed.includes(k) && v !== undefined);
  if (!entries.length) return await getProjectById(id);

  const allowedStatus = await listStatusOptions();
  const allowedPriority = await listPriorityOptions();
  for (const [k,v] of entries) {
    if (k === 'status' && !allowedStatus.includes(v)) throw new Error('Status inválido');
    if (k === 'priority' && !allowedPriority.includes(v)) throw new Error('Prioridade inválida');
    if (k === 'progress_pct' && (v < 0 || v > 100)) throw new Error('Progresso inválido');
  }

  const set = entries.map(([k], i) => `${k} = $${i+1}`).join(', ');
  const values = entries.map(([,v]) => v);

  const { rows } = await pool.query(
    `UPDATE projects p SET ${set}
      WHERE p.id = $${values.length + 1}
      RETURNING p.id AS id, p.name AS name, p.description AS description, p.status AS status,
                p.priority AS priority, p.progress_pct AS progress_pct, p.deadline AS deadline,
                p.manager_id AS manager_id, p.created_at AS created_at, p.updated_at AS updated_at`,
    [...values, id]
  );
  return rows[0] || null;
}

export async function deleteProject(id) {
  const { rows } = await pool.query(
    `DELETE FROM projects p WHERE p.id = $1
     RETURNING p.id AS id, p.name AS name, p.description AS description, p.status AS status,
               p.priority AS priority, p.progress_pct AS progress_pct, p.deadline AS deadline,
               p.manager_id AS manager_id, p.created_at AS created_at, p.updated_at AS updated_at`,
    [id]
  );
  return rows[0] || null;
}

export async function getMembers(project_id) {
  const { rows } = await pool.query(
    `SELECT u.id, (u.nome || ' ' || u.sobrenome) AS name, pm.role, pm.added_at
       FROM project_members pm
       JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1
      ORDER BY name`,
    [project_id]
  );
  return rows;
}

export async function replaceMembers(project_id, user_ids = [], role = 'Membro') {
  await pool.query('BEGIN');
  try {
    await pool.query('DELETE FROM project_members WHERE project_id = $1', [project_id]);

    if (user_ids.length) {
      const placeholders = user_ids.map((_, i) => `($1, $${i+2}, $${user_ids.length+2})`).join(', ');
      await pool.query(
        `INSERT INTO project_members (project_id, user_id, role)
         VALUES ${placeholders}`,
        [project_id, ...user_ids, role]
      );
    }

    await pool.query('COMMIT');
    return await getMembers(project_id);
  } catch (e) {
    await pool.query('ROLLBACK');
    throw e;
  }
}

export async function searchUsersByName(q = '', { limit = 20 } = {}) {
  const term = `%${q.trim()}%`;
  const { rows } = await pool.query(
    `SELECT u.id, (u.nome || ' ' || u.sobrenome) AS name, u.email, u.cargo
       FROM users u
      WHERE (u.nome || ' ' || u.sobrenome) ILIKE $1
      ORDER BY u.nome, u.sobrenome
      LIMIT $2`,
    [term, limit]
  );
  return rows;
}
