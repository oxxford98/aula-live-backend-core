import { Router } from "express";
import admin from "../config/firebase.js";
import {
  deleteUserByUid,
  getUserProfileByUid,
  isUsernameAvailable,
  loginWithGoogle,
  registerManualUser,
  toHttpError,
  updateUserProfileByUid,
} from "../services/users.service.js";

export const usersRouter = Router();

const getBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
};

usersRouter.post("/manual-register", async (req, res) => {
  try {
    const user = await registerManualUser(req.body);
    res.status(201).json({ message: "Usuario creado correctamente", user });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.statusCode).json({ error: httpError.message });
  }
});

usersRouter.post("/google-login", async (req, res) => {
  try {
    const result = await loginWithGoogle(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error("[users/google-login] Error procesando solicitud", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      hasIdToken: Boolean(req.body?.idToken),
      hasUsername: Boolean(req.body?.username),
    });
    const httpError = toHttpError(error);
    res.status(httpError.statusCode).json({ error: httpError.message });
  }
});

usersRouter.get("/username/:username/availability", async (req, res) => {
  try {
    const available = await isUsernameAvailable(req.params.username);
    res.status(200).json({ available });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.statusCode).json({ error: httpError.message });
  }
});

usersRouter.get("/me", async (req, res) => {
  try {
    const token = getBearerToken(req.header("authorization"));
    if (!token) {
      return res.status(401).json({ error: "No autorizado" });
    }
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await getUserProfileByUid(decoded.uid);
    res.status(200).json({ user });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.statusCode).json({ error: httpError.message });
  }
});

usersRouter.patch("/me", async (req, res) => {
  try {
    const token = getBearerToken(req.header("authorization"));
    if (!token) {
      return res.status(401).json({ error: "No autorizado" });
    }
    const decoded = await admin.auth().verifyIdToken(token);
    const user = await updateUserProfileByUid(decoded.uid, req.body);
    res.status(200).json({ message: "Perfil actualizado", user });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.statusCode).json({ error: httpError.message });
  }
});

usersRouter.delete("/:uid", async (req, res) => {
  try {
    const uid = String(req.params.uid || "").trim();
    if (!uid) {
      return res.status(400).json({ error: "El uid es obligatorio" });
    }

    await deleteUserByUid(uid);
    res.status(200).json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    const httpError = toHttpError(error);
    res.status(httpError.statusCode).json({ error: httpError.message });
  }
});
