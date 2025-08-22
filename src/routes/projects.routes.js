import {
    listStatusOptions, listPriorityOptions,
    getProjects, getProjectById, createProject, updateProject, deleteProject,
    getMembers, replaceMembers, searchUsersByName
  } from '../repositories/projects.repository.js';
  
  export default async function projectsRoutes(api) {
    // opções para popular selects
    api.get('/options/status', async (_req, rep) => rep.send(await listStatusOptions()));
    api.get('/options/priority', async (_req, rep) => rep.send(await listPriorityOptions()));
  
    // busca de usuários para "gestor/membros"
    api.get('/users/search', async (req, rep) => {
      const q = String(req.query?.q || '');
      const limit = Number(req.query?.limit || 20);
      const users = await searchUsersByName(q, { limit });
      rep.send(users);
    });
  
    // CRUD de projetos
    api.get('/projects', async (req, rep) => {
      const limit = Number(req.query?.limit || 50);
      const offset = Number(req.query?.offset || 0);
      const rows = await getProjects({ limit, offset });
      rep.send(rows);
    });
  
    api.get('/projects/:id', async (req, rep) => {
      const p = await getProjectById(req.params.id);
      if (!p) return rep.code(404).send({ error: 'Projeto não encontrado' });
      rep.send(p);
    });
  
    api.post('/projects', async (req, rep) => {
      const { name, manager_id } = req.body || {};
      if (!name || !manager_id) {
        return rep.code(400).send({ error: 'name e manager_id são obrigatórios.' });
      }
      try {
        const created = await createProject(req.body);
        rep.code(201).send(created);
      } catch (e) {
        req.log?.error?.(e);
        rep.code(400).send({ error: e.message || 'Erro ao criar projeto' });
      }
    });
  
    api.put('/projects/:id', async (req, rep) => {
      try {
        const up = await updateProject(req.params.id, req.body || {});
        if (!up) return rep.code(404).send({ error: 'Projeto não encontrado' });
        rep.send(up);
      } catch (e) {
        req.log?.error?.(e);
        rep.code(400).send({ error: e.message || 'Erro ao atualizar projeto' });
      }
    });
  
    api.delete('/projects/:id', async (req, rep) => {
      const del = await deleteProject(req.params.id);
      if (!del) return rep.code(404).send({ error: 'Projeto não encontrado' });
      rep.send({ message: 'Projeto removido', projeto: del });
    });
  
    // membros
    api.get('/projects/:id/members', async (req, rep) => {
      const rows = await getMembers(req.params.id);
      rep.send(rows);
    });
  
    // substitui a lista de membros (recebe array user_ids)
    api.put('/projects/:id/members', async (req, rep) => {
      const { user_ids = [], role = 'Membro' } = req.body || {};
      if (!Array.isArray(user_ids)) {
        return rep.code(400).send({ error: 'user_ids deve ser um array' });
      }
      try {
        const rows = await replaceMembers(req.params.id, user_ids, role);
        rep.send({ project_id: Number(req.params.id), members: rows });
      } catch (e) {
        req.log?.error?.(e);
        rep.code(400).send({ error: e.message || 'Erro ao sincronizar membros' });
      }
    });
  }
  