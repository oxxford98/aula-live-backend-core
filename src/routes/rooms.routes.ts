import { Router } from "express";
import admin from "../config/firebase.js";
import {
  createRoomForCreator,
  deleteRoomByIdForCreator,
  getRoomByIdForCreator,
  listRoomsByCreator,
  toHttpError,
  updateRoomByIdForCreator,
  getRoomById,
} from "../services/rooms.service.js";

export const roomsRouter = Router();

const getBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
};

const verifyRequestUser = async (authorizationHeader: string | undefined) => {
  const token = getBearerToken(authorizationHeader);
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  return admin.auth().verifyIdToken(token);
};

roomsRouter.get("/mine", async (req, res) => {
  try {
    const decoded = await verifyRequestUser(req.header("authorization"));
    const rooms = await listRoomsByCreator(decoded.uid);
    res.status(200).json({ rooms });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "No autorizado" });
    }

    const httpError = toHttpError(error);
    res.status(httpError.statusCode).json({ error: httpError.message });
  }
});

roomsRouter.post("/", async (req, res) => {
  try {
    const decoded = await verifyRequestUser(req.header("authorization"));
    const room = await createRoomForCreator(decoded.uid, req.body);
    res.status(201).json({ message: "Sala creada correctamente", room });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "No autorizado" });
    }

    const httpError = toHttpError(error);
    res.status(httpError.statusCode).json({ error: httpError.message });
  }
});

roomsRouter.get("/:roomId", async (req, res) => {
  try {
    const decoded = await verifyRequestUser(req.header("authorization"));
    const room = await getRoomById(req.params.roomId);
    res.status(200).json({ room });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "No autorizado" });
    }

    const httpError = toHttpError(error);
    res.status(httpError.statusCode).json({ error: httpError.message });
  }
});

roomsRouter.patch("/:roomId", async (req, res) => {
  try {
    const decoded = await verifyRequestUser(req.header("authorization"));
    const room = await updateRoomByIdForCreator(req.params.roomId, decoded.uid, req.body);
    res.status(200).json({ message: "Sala actualizada correctamente", room });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "No autorizado" });
    }

    const httpError = toHttpError(error);
    res.status(httpError.statusCode).json({ error: httpError.message });
  }
});

roomsRouter.delete("/:roomId", async (req, res) => {
  try {
    const decoded = await verifyRequestUser(req.header("authorization"));
    await deleteRoomByIdForCreator(req.params.roomId, decoded.uid);
    res.status(200).json({ message: "Sala eliminada correctamente" });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "No autorizado" });
    }

    const httpError = toHttpError(error);
    res.status(httpError.statusCode).json({ error: httpError.message });
  }
});
