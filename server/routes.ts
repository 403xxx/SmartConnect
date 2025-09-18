import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { jsExtractor } from "./services/jsExtractor";
import { insertExtractionJobSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create extraction job
  app.post("/api/extraction-jobs", async (req, res) => {
    try {
      const validatedData = insertExtractionJobSchema.parse(req.body);
      const job = await storage.createExtractionJob(validatedData);
      
      // Start extraction process asynchronously
      jsExtractor.extractJavaScript(job.id, job.url).catch(console.error);
      
      res.json(job);
    } catch (error) {
      console.error("Error creating extraction job:", error);
      res.status(400).json({ 
        message: error instanceof z.ZodError ? "Invalid request data" : "Failed to create extraction job" 
      });
    }
  });

  // Get extraction job by ID
  app.get("/api/extraction-jobs/:id", async (req, res) => {
    try {
      const job = await storage.getExtractionJobWithFiles(req.params.id);
      if (!job) {
        return res.status(404).json({ message: "Extraction job not found" });
      }
      res.json(job);
    } catch (error) {
      console.error("Error fetching extraction job:", error);
      res.status(500).json({ message: "Failed to fetch extraction job" });
    }
  });

  // Get recent jobs
  app.get("/api/extraction-jobs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const jobs = await storage.getRecentJobs(limit);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching recent jobs:", error);
      res.status(500).json({ message: "Failed to fetch recent jobs" });
    }
  });

  // Get JS files for a job
  app.get("/api/extraction-jobs/:id/files", async (req, res) => {
    try {
      const files = await storage.getJsFilesByJobId(req.params.id);
      res.json(files);
    } catch (error) {
      console.error("Error fetching JS files:", error);
      res.status(500).json({ message: "Failed to fetch JS files" });
    }
  });

  // Download individual file (placeholder - in real implementation would serve actual files)
  app.get("/api/downloads/:domain/:filename", async (req, res) => {
    const { domain, filename } = req.params;
    // In a real implementation, you'd serve the actual file from the downloads directory
    res.json({ message: `Download ${filename} from ${domain}` });
  });

  const httpServer = createServer(app);
  return httpServer;
}
