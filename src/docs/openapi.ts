export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Aula Live Backend API",
    version: "1.0.0",
    description:
      "Documentacion de endpoints para el backend de Aula Live (registro manual, login y onboarding con Google).",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local",
    },
  ],
  tags: [
    { name: "Health", description: "Verificacion del estado del servidor" },
    { name: "Users", description: "Registro y autenticacion de usuarios" },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Servidor activo",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/users/manual-register": {
      post: {
        tags: ["Users"],
        summary: "Crear usuario manual",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/ManualRegisterRequest",
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Usuario creado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: {
                      type: "string",
                      example: "Usuario creado correctamente",
                    },
                    user: { $ref: "#/components/schemas/UserProfile" },
                  },
                },
              },
            },
          },
          "400": {
            description: "Datos invalidos",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Email o username ya en uso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/users/google-login": {
      post: {
        tags: ["Users"],
        summary: "Login/Onboarding con Google",
        description:
          "Valida un idToken de Google en Firebase. Si es el primer login sin username, responde requiresUsername=true para completar perfil.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/GoogleLoginRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login valido",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/GoogleLoginResponse",
                },
              },
            },
          },
          "400": {
            description: "Token invalido o username faltante en primer login",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "409": {
            description: "Username ya en uso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/users/username/{username}/availability": {
      get: {
        tags: ["Users"],
        summary: "Verificar disponibilidad de username",
        parameters: [
          {
            in: "path",
            name: "username",
            required: true,
            schema: { type: "string" },
            description: "Username a consultar",
          },
        ],
        responses: {
          "200": {
            description: "Disponibilidad calculada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    available: { type: "boolean", example: false },
                  },
                },
              },
            },
          },
          "400": {
            description: "Username invalido",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/users/{uid}": {
      delete: {
        tags: ["Users"],
        summary: "Eliminar usuario por uid",
        description:
          "Elimina un usuario por uid en Firebase Authentication, Firestore users y Firestore usernames.",
        parameters: [
          {
            in: "path",
            name: "uid",
            required: true,
            schema: { type: "string", example: "AbCdEf123456" },
            description: "UID del usuario que se desea eliminar",
          },
        ],
        responses: {
          "200": {
            description: "Usuario eliminado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    message: { type: "string", example: "Usuario eliminado correctamente" },
                  },
                },
              },
            },
          },
          "400": {
            description: "UID invalido",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
          "404": {
            description: "Usuario no encontrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ManualRegisterRequest: {
        type: "object",
        required: ["firstName", "lastName", "avatarUrl", "email", "password", "username"],
        properties: {
          firstName: { type: "string", example: "Juan" },
          lastName: { type: "string", example: "Perez" },
          avatarUrl: {
            type: "string",
            example: "/avatars/avatar-01.png",
            description: "Ruta local de avatar o URL externa",
          },
          email: { type: "string", format: "email", example: "jperez@universidad.edu" },
          password: { type: "string", minLength: 6, example: "123456" },
          username: { type: "string", example: "usuario_01" },
        },
      },
      GoogleLoginRequest: {
        type: "object",
        required: ["idToken"],
        properties: {
          idToken: { type: "string", example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." },
          username: {
            type: "string",
            description: "Obligatorio solo en el primer login con Google",
            example: "usuario_google",
          },
          avatarUrl: {
            type: "string",
            description: "Opcional. Permite elegir avatar en la finalizacion del primer login con Google",
            example: "/avatars/avatar-03.png",
          },
        },
      },
      UserProfile: {
        type: "object",
        properties: {
          uid: { type: "string" },
          email: { type: "string", format: "email" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          username: { type: "string" },
          usernameNormalized: { type: "string" },
          provider: { type: "string", enum: ["manual", "google"] },
          displayName: { type: "string" },
          avatarUrl: { type: "string" },
          createdAt: { type: "string", nullable: true, format: "date-time" },
          updatedAt: { type: "string", nullable: true, format: "date-time" },
        },
      },
      GoogleLoginResponse: {
        oneOf: [
          {
            type: "object",
            properties: {
              requiresUsername: { type: "boolean", example: false },
              isNewUser: { type: "boolean", example: true },
              user: { $ref: "#/components/schemas/UserProfile" },
            },
          },
          {
            type: "object",
            properties: {
              requiresUsername: { type: "boolean", example: true },
              googleProfile: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  firstName: { type: "string" },
                  lastName: { type: "string" },
                  avatarUrl: { type: "string" },
                },
              },
            },
          },
        ],
      },
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "El username ya esta en uso" },
        },
      },
    },
  },
};
