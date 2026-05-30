import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { router } from "./routes/index.js";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapi.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
app.use(express.json());
app.use("/api", router);
app.get("/api/docs.json", (_req, res) => {
  res.json(openApiSpec);
});
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api/docs`);
});