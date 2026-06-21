import admin, { db } from "../config/firebase.js";

type Room = {
  id: string;
  name: string;
  description: string;
  creatorUid: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type JoinedRoom = Room & {
  lastJoinedAt: string | null;
};

type CreateRoomInput = {
  name: string;
  description: string;
};

type UpdateRoomInput = {
  name?: string;
  description?: string;
};

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

const ROOM_ID_REGEX = /^[A-Z]{3}-[A-Z]{3}-[A-Z]{3}$/;
const ROOM_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const toIsoDate = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }

  return null;
};

const formatRoom = (id: string, data: FirebaseFirestore.DocumentData): Room => {
  return {
    id,
    name: String(data.name || ""),
    description: String(data.description || ""),
    creatorUid: String(data.creatorUid || ""),
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
  };
};

const formatJoinedRoom = (
  id: string,
  data: FirebaseFirestore.DocumentData,
): JoinedRoom => {
  return {
    id,
    name: String(data.name || ""),
    description: String(data.description || ""),
    creatorUid: String(data.creatorUid || ""),
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
    lastJoinedAt: toIsoDate(data.lastJoinedAt),
  };
};

const validateCreatorUid = (uid: string): string => {
  const normalizedUid = uid?.trim();
  if (!normalizedUid) {
    throw new HttpError(400, "El creador es obligatorio");
  }

  return normalizedUid;
};

const validateRoomName = (name: string): string => {
  const trimmed = name?.trim();

  if (!trimmed) {
    throw new HttpError(400, "El nombre de la sala es obligatorio");
  }

  if (trimmed.length < 3) {
    throw new HttpError(400, "El nombre de la sala debe tener al menos 3 caracteres");
  }

  if (trimmed.length > 80) {
    throw new HttpError(400, "El nombre de la sala no puede superar los 80 caracteres");
  }

  return trimmed;
};

const validateRoomDescription = (description: string): string => {
  const trimmed = description?.trim();

  if (!trimmed) {
    throw new HttpError(400, "La descripcion de la sala es obligatoria");
  }

  if (trimmed.length < 3) {
    throw new HttpError(400, "La descripcion de la sala debe tener al menos 3 caracteres");
  }

  if (trimmed.length > 240) {
    throw new HttpError(400, "La descripcion de la sala no puede superar los 240 caracteres");
  }

  return trimmed;
};

const validateRoomId = (roomId: string): string => {
  const normalizedRoomId = roomId?.trim().toUpperCase();
  if (!ROOM_ID_REGEX.test(normalizedRoomId)) {
    throw new HttpError(400, "El id de la sala no es valido");
  }

  return normalizedRoomId;
};

const generateRoomIdChunk = (): string => {
  return Array.from({ length: 3 }, () => {
    const index = Math.floor(Math.random() * ROOM_ID_ALPHABET.length);
    return ROOM_ID_ALPHABET[index];
  }).join("");
};

const generateRoomId = (): string => {
  return `${generateRoomIdChunk()}-${generateRoomIdChunk()}-${generateRoomIdChunk()}`;
};

const generateUniqueRoomId = async (): Promise<string> => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = generateRoomId();
    const existingRoom = await db.collection("rooms").doc(candidate).get();
    if (!existingRoom.exists) {
      return candidate;
    }
  }

  throw new HttpError(500, "No se pudo generar un id unico para la sala");
};

const getOwnedRoomDoc = async (roomId: string, creatorUid: string) => {
  const roomRef = db.collection("rooms").doc(validateRoomId(roomId));
  const roomDoc = await roomRef.get();

  if (!roomDoc.exists) {
    throw new HttpError(404, "Sala no encontrada");
  }

  if (String(roomDoc.data()?.creatorUid || "") !== validateCreatorUid(creatorUid)) {
    throw new HttpError(403, "No tienes permiso para gestionar esta sala");
  }

  return { roomRef, roomDoc };
};

export const createRoomForCreator = async (creatorUid: string, input: CreateRoomInput): Promise<Room> => {
  const normalizedCreatorUid = validateCreatorUid(creatorUid);
  const name = validateRoomName(input.name);
  const description = validateRoomDescription(input.description);
  const roomId = await generateUniqueRoomId();
  const roomRef = db.collection("rooms").doc(roomId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  await roomRef.set({
    id: roomId,
    name,
    description,
    creatorUid: normalizedCreatorUid,
    createdAt: now,
    updatedAt: now,
  });

  const createdRoom = await roomRef.get();
  if (!createdRoom.exists) {
    throw new HttpError(500, "No se pudo crear la sala");
  }

  return formatRoom(roomId, createdRoom.data()!);
};

export const listRoomsByCreator = async (creatorUid: string): Promise<Room[]> => {
  const normalizedCreatorUid = validateCreatorUid(creatorUid);
  const snapshot = await db.collection("rooms").where("creatorUid", "==", normalizedCreatorUid).get();

  return snapshot.docs
    .map((doc) => formatRoom(doc.id, doc.data()))
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });
};

export const getRoomByIdForCreator = async (roomId: string, creatorUid: string): Promise<Room> => {
  const { roomDoc } = await getOwnedRoomDoc(roomId, creatorUid);
  return formatRoom(roomDoc.id, roomDoc.data()!);
};

export const getRoomById = async (roomId: string): Promise<Room> => {
  const roomRef = db.collection("rooms").doc(validateRoomId(roomId));
  const roomDoc = await roomRef.get();
  if (!roomDoc.exists) {
    throw new HttpError(404, "Sala no encontrada");
  }
  return formatRoom(roomDoc.id, roomDoc.data()!);
};

export const markRoomAsJoinedByUser = async (roomId: string, userUid: string): Promise<void> => {
  const normalizedRoomId = validateRoomId(roomId);
  const normalizedUserUid = validateCreatorUid(userUid);

  const roomRef = db.collection("rooms").doc(normalizedRoomId);
  const roomDoc = await roomRef.get();
  if (!roomDoc.exists) {
    throw new HttpError(404, "Sala no encontrada");
  }

  const roomData = roomDoc.data()!;
  const joinedRoomRef = db
    .collection("users")
    .doc(normalizedUserUid)
    .collection("joinedRooms")
    .doc(normalizedRoomId);

  await joinedRoomRef.set(
    {
      id: normalizedRoomId,
      name: String(roomData.name || ""),
      description: String(roomData.description || ""),
      creatorUid: String(roomData.creatorUid || ""),
      createdAt: roomData.createdAt || null,
      updatedAt: roomData.updatedAt || null,
      lastJoinedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};

export const listJoinedRoomsByUser = async (userUid: string): Promise<JoinedRoom[]> => {
  const normalizedUserUid = validateCreatorUid(userUid);
  const snapshot = await db
    .collection("users")
    .doc(normalizedUserUid)
    .collection("joinedRooms")
    .orderBy("lastJoinedAt", "desc")
    .get();

  return snapshot.docs.map((doc) => formatJoinedRoom(doc.id, doc.data()));
};

export const updateRoomByIdForCreator = async (
  roomId: string,
  creatorUid: string,
  input: UpdateRoomInput,
): Promise<Room> => {
  const { roomRef } = await getOwnedRoomDoc(roomId, creatorUid);
  const updates: Record<string, unknown> = {};

  if (typeof input.name !== "undefined") {
    updates.name = validateRoomName(input.name);
  }

  if (typeof input.description !== "undefined") {
    updates.description = validateRoomDescription(input.description);
  }

  if (Object.keys(updates).length === 0) {
    throw new HttpError(400, "Debes enviar al menos un campo para actualizar");
  }

  await roomRef.set(
    {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  const updatedRoom = await roomRef.get();
  if (!updatedRoom.exists) {
    throw new HttpError(500, "No se pudo actualizar la sala");
  }

  return formatRoom(updatedRoom.id, updatedRoom.data()!);
};

export const deleteRoomByIdForCreator = async (roomId: string, creatorUid: string): Promise<void> => {
  const { roomRef } = await getOwnedRoomDoc(roomId, creatorUid);
  await roomRef.delete();
};

export const toHttpError = (error: unknown): HttpError => {
  if (error instanceof HttpError) {
    return error;
  }

  console.error("[rooms.service] Unhandled error", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  return new HttpError(500, "Error interno del servidor");
};
