import express from "express";
import cors from "cors";
import { sessionRouter } from "./routes/session";
import { actionRouter } from "./routes/actions";
import { webhookRouter } from "./routes/webhook";

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/session", sessionRouter);
app.use("/action", actionRouter);
app.use("/webhook", webhookRouter);

app.listen(port, () => {
  console.log(`crisis-coach-server listening on ${port}`);
});
