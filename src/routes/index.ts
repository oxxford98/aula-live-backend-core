import { Router } from "express";
import { roomsRouter } from "./rooms.routes.js";
import { usersRouter } from "./users.routes.js";

export const router = Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

router.use("/users", usersRouter);
router.use("/rooms", roomsRouter);