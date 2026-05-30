const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export const normalizeUsername = (username: string): string => username.trim().toLowerCase();

export const validateUsername = (
  username: string,
): { isValid: true } | { isValid: false; message: string } => {
  const trimmedUsername = username.trim();

  if (!trimmedUsername) {
    return { isValid: false, message: "El username es obligatorio" };
  }

  if (!USERNAME_REGEX.test(trimmedUsername)) {
    return {
      isValid: false,
      message:
        "El username debe tener entre 3 y 20 caracteres y solo puede incluir letras, numeros y guion bajo",
    };
  }

  return { isValid: true };
};
