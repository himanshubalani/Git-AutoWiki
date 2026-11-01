import express from "express";
import "dotenv/config";
import { inngest, functions } from "./inngest/index.js";
import { serve } from "inngest/express";
import indexRoutes from "./routes/index.routes.js";
import chatRoutes from "./routes/chat.routes.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
  const isInngestHealthCheck = req.method === "PUT" && req.originalUrl === "/api/inngest";

  if (!isInngestHealthCheck) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log("Request body:", JSON.stringify(req.body, null, 2));
    }
  }

  next();
});

app.use("/api/inngest", serve({ client: inngest, functions }));

app.get("/", (req, res) => {
  console.log("GET / => hello world");
  res.send("hello world");
});

app.use("/api/index", indexRoutes);
app.use("/api/chat", chatRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

