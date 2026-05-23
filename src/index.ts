import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config.js";
import { initFirebase } from "./services/firebase.js";
import { accountsRouter } from "./routes/accounts.js";
import { authRouter } from "./routes/auth.js";
import { pubsubRouter } from "./routes/pubsub.js";
import { syncsRouter } from "./routes/syncs.js";
import { reviewsRouter } from "./routes/reviews.js";
import { scraperRouter } from "./routes/scraper.js";
import { peopleRouter } from "./routes/people.js";
import { signalsRouter } from "./routes/signals.js";
import { startWatchRenewalJob } from "./jobs/watch-renewal.js";

initFirebase();

const app = express();
app.use(helmet());
app.use(cors({ origin: env.webAppUrl, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/accounts", accountsRouter);
app.use("/auth", authRouter);
app.use("/pubsub", pubsubRouter);
app.use("/syncs", syncsRouter);
app.use("/reviews", reviewsRouter);
app.use("/scraper", scraperRouter);
app.use("/people", peopleRouter);
app.use("/signals", signalsRouter);

startWatchRenewalJob();

app.listen(env.port, () => {
    console.log(`CRM API listening on http://localhost:${env.port}`);
});
