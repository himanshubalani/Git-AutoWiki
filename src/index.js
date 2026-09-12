import express from "express";
import "dotenv/config"
import { inngest, functions } from "./inngest/index.js";
import { serve } from "inngest/express";
import indexRoutes from "./routes/index.routes.js"

const app = express();
app.use(express.json())
app.use("/api/inngest" , serve({ client: inngest, functions }));

app.get("/", (req, res)=> {
	res.send("Wakanda Forever");
})

app.use("/api/index", indexRoutes);


app.listen(3000, ()=> {
	console.log("server is running on port 3000");
})

