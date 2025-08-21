import {
  getAllUsers,
  getUserById,
  getServerTime,
  createUser,
  updateUser,
  updateUserPassword,
  deleteUser,
} from "../repositories/perfil.repository.js";

export default async function usersRoutes(api) {
  api.get("/status", async (_req, reply) => {
    try {
      const serverTime = await getServerTime();
      reply.send({ serverTime });
    } catch (err) {
      api.log.error(err);
      reply.code(500).send({ error: "Erro ao conectar ao banco de dados" });
    }
  });

  api.get("/users", async (_req, reply) => {
    try {
      const users = await getAllUsers();
      reply.send(users);
    } catch (err) {
      api.log.error(err);
      reply.code(500).send({ error: "Erro ao buscar usuários" });
    }
  });

  api.get("/users/:id", async (req, rep) => {
    try {
      const user = await getUserById(req.params.id);
      if (!user) return rep.code(404).send({ error: "Usuário não encontrado" });
      rep.send(user);
    } catch (err) {
      api.log.error(err);
      rep.code(500).send({ error: "Erro ao buscar usuário" });
    }
  });

  api.post("/users", async (req, rep) => {
    try {
      const { nome, sobrenome, email, senha_hash } = req.body || {};
      if (!nome || !sobrenome || !email || !senha_hash) {
        return rep.code(400).send({ error: "nome, sobrenome, email e senha_hash são obrigatórios" });
      }
      const user = await createUser(req.body);
      rep.code(201).send(user);
    } catch (err) {
      api.log.error(err);
      // violação de unicidade (email)
      if (err.code === '23505') {
        return rep.code(409).send({ error: "E-mail já cadastrado" });
      }
      rep.code(500).send({ error: "Erro ao criar usuário" });
    }
  });

  // Atualização parcial do perfil (qualquer campo permitido)
  api.put("/users/:id", async (req, rep) => {
    const { id } = req.params;
    try {
      const user = await updateUser(id, req.body || {});
      if (!user) return rep.code(404).send({ error: "Usuário não encontrado" });
      rep.send(user);
    } catch (err) {
      api.log.error(err);
      if (err.code === '23505') {
        return rep.code(409).send({ error: "E-mail já cadastrado" });
      }
      rep.code(500).send({ error: "Erro ao atualizar usuário" });
    }
  });

  // Troca de senha (somente senha_hash)
  api.put("/users/:id/password", async (req, rep) => {
    const { id } = req.params;
    const { senha_hash } = req.body || {};
    if (!senha_hash) return rep.code(400).send({ error: "senha_hash é obrigatória" });

    try {
      const result = await updateUserPassword(id, senha_hash);
      if (!result) return rep.code(404).send({ error: "Usuário não encontrado" });
      rep.send({ message: "Senha atualizada", id: result.id, updated_at: result.updated_at });
    } catch (err) {
      api.log.error(err);
      rep.code(500).send({ error: "Erro ao atualizar senha" });
    }
  });

  api.delete("/users/:id", async (req, rep) => {
    const { id } = req.params;
    try {
      const user = await deleteUser(id);
      if (!user) {
        rep.code(404).send({ error: "Usuário não encontrado" });
      } else {
        rep.send({ message: "Usuário removido com sucesso", usuario: user });
      }
    } catch (err) {
      api.log.error(err);
      rep.code(500).send({ error: "Erro ao deletar usuário" });
    }
  });
}
