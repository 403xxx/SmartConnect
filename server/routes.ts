import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { jsExtractor } from "./services/jsExtractor";
import { insertExtractionJobSchema } from "@shared/schema";
import path from "path";
import express from "express";

export async function registerRoutes(app: Express): Promise<Server> {
  // ✅ Serve the downloads folder publicly
  app.use("/downloads", express.static(path.join(process.cwd(), "downloads")));

  // ✅ Create extraction job
  app.post("/api/extraction-jobs", async (req, res) => {
    try {
      const validatedData = insertExtractionJobSchema.parse(req.body);
      const job = await storage.createExtractionJob(validatedData);

      // Start extraction process asynchronously
      jsExtractor.extractJavaScript(job.id, job.url).catch(console.error);

      res.json(job);
    } catch (error) {
      console.error("Error creating extraction job:", error);
      res.status(400).json({ error: "Invalid request" });
    }
  });

  return createServer(app);
}
