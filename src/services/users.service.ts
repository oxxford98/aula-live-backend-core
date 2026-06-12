import admin, { db } from "../config/firebase.js";
import { normalizeUsername, validateUsername } from "../utils/username.js";

type UserProvider = "manual" | "google";

type UserProfile = {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  usernameNormalized: string;
  provider: UserProvider;
  displayName: string;
  avatarUrl: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type ManualRegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  username: string;
  avatarUrl: string;
};

type GoogleLoginInput = {
  idToken: string;
  username?: string;
  avatarUrl?: string;
};

type GoogleLoginResponse =
  | { requiresUsername: false; isNewUser: boolean; user: UserProfile }
  | {
      requiresUsername: true;
      googleProfile: {
        email: string;
        firstName: string;
        lastName: string;
        avatarUrl: string;
      };
    };

type UpdateUserProfileInput = {
  firstName: string;
  lastName: string;
  avatarUrl: string;
  username?: string;
  email?: string;
};

class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

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

const formatUserProfile = (
  uid: string,
  data: FirebaseFirestore.DocumentData,
): UserProfile => {
  return {
    uid,
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    username: data.username,
    usernameNormalized: data.usernameNormalized,
    provider: data.provider,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl,
    createdAt: toIsoDate(data.createdAt),
    updatedAt: toIsoDate(data.updatedAt),
  };
};

const validateEmail = (email: string): string => {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new HttpError(400, "El email es obligatorio");
  }

  return normalizedEmail;
};

const validateInstitutionalEmail = (email: string): string => {
  const normalizedEmail = validateEmail(email);
  const institutionalEmailRegex = /^[^\s@]+@[^\s@]+\.(edu|edu\.[a-z]{2,})$/i;

  if (!institutionalEmailRegex.test(normalizedEmail)) {
    throw new HttpError(400, "Debes registrar un correo institucional");
  }

  return normalizedEmail;
};

const validateRequiredText = (value: string, fieldName: string): string => {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new HttpError(400, `${fieldName} es obligatorio`);
  }

  return trimmed;
};

const validateAvatarUrl = (avatarUrl: string): string => {
  const trimmed = avatarUrl?.trim();

  if (!trimmed) {
    throw new HttpError(400, "El avatar es obligatorio");
  }

  if (trimmed.startsWith("/avatars/") && trimmed.endsWith(".png")) {
    return trimmed;
  }

  try {
    new URL(trimmed);
  } catch {
    throw new HttpError(400, "El avatar debe ser una URL valida o una ruta local /avatars/*.png");
  }

  return trimmed;
};

const assertPassword = (password: string): void => {
  if (!password?.trim()) {
    throw new HttpError(400, "El password es obligatorio");
  }

  if (password.length < 6) {
    throw new HttpError(400, "El password debe tener al menos 6 caracteres");
  }
};

const reserveUsernameForUser = async (params: {
  uid: string;
  username: string;
  usernameNormalized: string;
  email: string;
  firstName: string;
  lastName: string;
  provider: UserProvider;
  avatarUrl: string;
}): Promise<void> => {
  const usersRef = db.collection("users").doc(params.uid);
  const usernamesRef = db.collection("usernames").doc(params.usernameNormalized);

  await db.runTransaction(async (transaction) => {
    const [existingUsername, existingUser] = await Promise.all([
      transaction.get(usernamesRef),
      transaction.get(usersRef),
    ]);

    if (existingUsername.exists) {
      throw new HttpError(409, "El username ya esta en uso");
    }

    if (existingUser.exists) {
      throw new HttpError(409, "El usuario ya existe");
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    transaction.set(usernamesRef, {
      uid: params.uid,
      username: params.username,
      createdAt: now,
    });

    transaction.set(usersRef, {
      uid: params.uid,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      username: params.username,
      usernameNormalized: params.usernameNormalized,
      provider: params.provider,
      displayName: `${params.firstName} ${params.lastName}`.trim(),
      avatarUrl: params.avatarUrl,
      createdAt: now,
      updatedAt: now,
    });
  });
};

const splitFullName = (fullName: string | null | undefined): { firstName: string; lastName: string } => {
  const normalizedName = fullName?.trim() ?? "";

  if (!normalizedName) {
    return {
      firstName: "Usuario",
      lastName: "Google",
    };
  }

  const chunks = normalizedName.split(/\s+/);
  const firstName = chunks[0] || "Usuario";
  const lastName = chunks.slice(1).join(" ") || "Google";

  return { firstName, lastName };
};

export const registerManualUser = async (input: ManualRegisterInput): Promise<UserProfile> => {
  const firstName = validateRequiredText(input.firstName, "El nombre");
  const lastName = validateRequiredText(input.lastName, "El apellido");
  const email = validateInstitutionalEmail(input.email);
  assertPassword(input.password);
  const avatarUrl = validateAvatarUrl(input.avatarUrl);

  const usernameValidation = validateUsername(input.username);
  if (!usernameValidation.isValid) {
    throw new HttpError(400, usernameValidation.message);
  }

  const username = input.username.trim();
  const usernameNormalized = normalizeUsername(username);
  const displayName = `${firstName} ${lastName}`.trim();

  let createdAuthUserUid: string | null = null;

  try {
    const authUser = await admin.auth().createUser({
      email,
      password: input.password,
      displayName,
    });

    createdAuthUserUid = authUser.uid;

    await reserveUsernameForUser({
      uid: authUser.uid,
      username,
      usernameNormalized,
      email,
      firstName,
      lastName,
      provider: "manual",
      avatarUrl,
    });

    const userDoc = await db.collection("users").doc(authUser.uid).get();
    if (!userDoc.exists) {
      throw new HttpError(500, "No se pudo crear el perfil de usuario");
    }

    return formatUserProfile(authUser.uid, userDoc.data()!);
  } catch (error) {
    if (createdAuthUserUid) {
      await admin
        .auth()
        .deleteUser(createdAuthUserUid)
        .catch(() => undefined);
    }

    if (error instanceof HttpError) {
      throw error;
    }

    if (error instanceof Error && error.message.includes("email-already-exists")) {
      throw new HttpError(409, "El email ya esta en uso");
    }

    throw new HttpError(500, "Error al registrar usuario manual");
  }
};

export const loginWithGoogle = async (
  input: GoogleLoginInput,
): Promise<GoogleLoginResponse> => {
  if (!input.idToken?.trim()) {
    throw new HttpError(400, "El idToken es obligatorio");
  }

  const decodedToken = await admin.auth().verifyIdToken(input.idToken);
  const provider = decodedToken.firebase?.sign_in_provider;

  if (provider !== "google.com") {
    throw new HttpError(400, "El token no corresponde a un login con Google");
  }

  const uid = decodedToken.uid;
  const email = validateEmail(decodedToken.email ?? "");
  const parsedName = splitFullName(decodedToken.name);
  const avatarUrl = input.avatarUrl
    ? validateAvatarUrl(input.avatarUrl)
    : validateAvatarUrl(decodedToken.picture ?? "https://ui-avatars.com/api/?name=Google+User");

  const existingUserDoc = await db.collection("users").doc(uid).get();
  if (existingUserDoc.exists) {
    return {
      requiresUsername: false,
      isNewUser: false,
      user: formatUserProfile(uid, existingUserDoc.data()!),
    };
  }

  if (!input.username) {
    return {
      requiresUsername: true,
      googleProfile: {
        email,
        firstName: parsedName.firstName,
        lastName: parsedName.lastName,
        avatarUrl,
      },
    };
  }

  const usernameValidation = validateUsername(input.username);
  if (!usernameValidation.isValid) {
    throw new HttpError(400, usernameValidation.message);
  }

  const username = input.username.trim();
  const usernameNormalized = normalizeUsername(username);

  await reserveUsernameForUser({
    uid,
    username,
    usernameNormalized,
    email,
    firstName: parsedName.firstName,
    lastName: parsedName.lastName,
    provider: "google",
    avatarUrl,
  });

  const createdUserDoc = await db.collection("users").doc(uid).get();
  if (!createdUserDoc.exists) {
    throw new HttpError(500, "No se pudo crear el perfil para Google login");
  }

  return {
    requiresUsername: false,
    isNewUser: true,
    user: formatUserProfile(uid, createdUserDoc.data()!),
  };
};

export const isUsernameAvailable = async (username: string): Promise<boolean> => {
  const usernameValidation = validateUsername(username);
  if (!usernameValidation.isValid) {
    throw new HttpError(400, usernameValidation.message);
  }

  const usernameNormalized = normalizeUsername(username);
  const usernameDoc = await db.collection("usernames").doc(usernameNormalized).get();
  return !usernameDoc.exists;
};

export const getUserProfileByUid = async (uid: string): Promise<UserProfile> => {
  const userDoc = await db.collection("users").doc(uid).get();

  if (!userDoc.exists) {
    throw new HttpError(404, "Perfil de usuario no encontrado");
  }

  return formatUserProfile(uid, userDoc.data()!);
};

export const updateUserProfileByUid = async (
  uid: string,
  input: UpdateUserProfileInput,
): Promise<UserProfile> => {
  const firstName = validateRequiredText(input.firstName, "El nombre");
  const lastName = validateRequiredText(input.lastName, "El apellido");
  const avatarUrl = validateAvatarUrl(input.avatarUrl);
  const requestedUsername = input.username?.trim();
  const requestedEmail = input.email?.trim();

  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpError(404, "Perfil de usuario no encontrado");
  }

  const currentData = userDoc.data()!;
  const currentUsername = String(currentData.username || "");
  const currentUsernameNormalized = String(currentData.usernameNormalized || normalizeUsername(currentUsername));
  const currentEmail = validateEmail(String(currentData.email || ""));
  const provider = currentData.provider as UserProvider;

  let username = currentUsername;
  if (requestedUsername !== undefined) {
    const usernameValidation = validateUsername(requestedUsername);
    if (!usernameValidation.isValid) {
      throw new HttpError(400, usernameValidation.message);
    }
    username = requestedUsername;
  }

  const usernameNormalized = normalizeUsername(username);
  const shouldChangeUsername = usernameNormalized !== currentUsernameNormalized;

  let email = currentEmail;
  let shouldUpdateEmailInAuth = false;
  if (requestedEmail !== undefined) {
    const normalizedRequestedEmail = validateEmail(requestedEmail);
    if (normalizedRequestedEmail !== currentEmail) {
      if (provider !== "manual") {
        throw new HttpError(400, "No puedes editar el correo porque tu cuenta fue registrada con Google");
      }

      email = validateInstitutionalEmail(normalizedRequestedEmail);
      shouldUpdateEmailInAuth = true;
    }
  }

  const displayName = `${firstName} ${lastName}`.trim();
  const shouldUpdateDisplayNameInAuth = displayName !== String(currentData.displayName || "");

  if (shouldUpdateEmailInAuth || shouldUpdateDisplayNameInAuth) {
    try {
      const authUpdate: admin.auth.UpdateRequest = {};
      if (shouldUpdateEmailInAuth) {
        authUpdate.email = email;
      }
      if (shouldUpdateDisplayNameInAuth) {
        authUpdate.displayName = displayName;
      }
      await admin.auth().updateUser(uid, authUpdate);
    } catch (error) {
      if (error instanceof Error && error.message.includes("email-already-exists")) {
        throw new HttpError(409, "El email ya esta en uso");
      }

      throw new HttpError(500, "No se pudo actualizar el usuario en Firebase Authentication");
    }
  }

  await db.runTransaction(async (transaction) => {
    const freshUserDoc = await transaction.get(userRef);
    if (!freshUserDoc.exists) {
      throw new HttpError(404, "Perfil de usuario no encontrado");
    }

    const freshData = freshUserDoc.data()!;
    const freshUsernameNormalized = String(
      freshData.usernameNormalized || normalizeUsername(String(freshData.username || "")),
    );

    if (shouldChangeUsername) {
      const newUsernameRef = db.collection("usernames").doc(usernameNormalized);
      const existingUsernameDoc = await transaction.get(newUsernameRef);

      if (existingUsernameDoc.exists) {
        const existingUid = String(existingUsernameDoc.data()?.uid || "");
        if (existingUid && existingUid !== uid) {
          throw new HttpError(409, "El username ya esta en uso");
        }
      }

      const previousUsernameRef = db.collection("usernames").doc(freshUsernameNormalized);
      transaction.delete(previousUsernameRef);
      transaction.set(newUsernameRef, {
        uid,
        username,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const nextUserPayload: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
      firstName,
      lastName,
      avatarUrl,
      email,
      displayName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (shouldChangeUsername) {
      nextUserPayload.username = username;
      nextUserPayload.usernameNormalized = usernameNormalized;
    }

    transaction.set(userRef, nextUserPayload, { merge: true });
  });

  const updatedDoc = await userRef.get();
  if (!updatedDoc.exists) {
    throw new HttpError(500, "No se pudo actualizar el perfil");
  }

  return formatUserProfile(uid, updatedDoc.data()!);
};

const isAuthUserNotFoundError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeCode = "code" in error ? String((error as { code?: unknown }).code) : "";
  const maybeMessage = "message" in error ? String((error as { message?: unknown }).message) : "";

  return maybeCode.includes("auth/user-not-found") || maybeMessage.includes("auth/user-not-found");
};

export const deleteUserByUid = async (uid: string): Promise<void> => {
  const normalizedUid = uid?.trim();
  if (!normalizedUid) {
    throw new HttpError(400, "El uid es obligatorio");
  }

  const userRef = db.collection("users").doc(normalizedUid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    const usernameNormalized = userDoc.data()?.usernameNormalized as string | undefined;

    await db.runTransaction(async (transaction) => {
      const freshUserDoc = await transaction.get(userRef);
      if (!freshUserDoc.exists) {
        return;
      }

      transaction.delete(userRef);

      const freshUsernameNormalized = (freshUserDoc.data()?.usernameNormalized as string | undefined) || usernameNormalized;
      if (freshUsernameNormalized) {
        const usernameRef = db.collection("usernames").doc(freshUsernameNormalized);
        transaction.delete(usernameRef);
      }
    });
  }

  let authUserMissing = false;
  try {
    await admin.auth().deleteUser(normalizedUid);
  } catch (error) {
    if (isAuthUserNotFoundError(error)) {
      authUserMissing = true;
    } else {
      throw new HttpError(500, "No se pudo eliminar el usuario en Firebase Authentication");
    }
  }

  if (!userDoc.exists && authUserMissing) {
    throw new HttpError(404, "Usuario no encontrado");
  }
};

export const toHttpError = (error: unknown): HttpError => {
  if (error instanceof HttpError) {
    return error;
  }

  console.error("[users.service] Unhandled error", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });

  return new HttpError(500, "Error interno del servidor");
};
