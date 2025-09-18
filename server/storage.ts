import { type ExtractionJob, type InsertExtractionJob, type JsFile, type InsertJsFile, type ExtractionJobWithFiles } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Extraction jobs
  createExtractionJob(job: InsertExtractionJob): Promise<ExtractionJob>;
  getExtractionJob(id: string): Promise<ExtractionJob | undefined>;
  updateExtractionJob(id: string, updates: Partial<ExtractionJob>): Promise<ExtractionJob | undefined>;
  getExtractionJobWithFiles(id: string): Promise<ExtractionJobWithFiles | undefined>;
  getRecentJobs(limit?: number): Promise<ExtractionJob[]>;
  
  // JS files
  createJsFile(file: InsertJsFile): Promise<JsFile>;
  updateJsFile(id: string, updates: Partial<JsFile>): Promise<JsFile | undefined>;
  getJsFilesByJobId(jobId: string): Promise<JsFile[]>;
}

export class MemStorage implements IStorage {
  private jobs: Map<string, ExtractionJob>;
  private jsFiles: Map<string, JsFile>;

  constructor() {
    this.jobs = new Map();
    this.jsFiles = new Map();
  }

  async createExtractionJob(insertJob: InsertExtractionJob): Promise<ExtractionJob> {
    const id = randomUUID();
    const job: ExtractionJob = {
      ...insertJob,
      id,
      status: "pending",
      totalFiles: 0,
      successfulFiles: 0,
      failedFiles: 0,
      totalSize: 0,
      domain: new URL(insertJob.url).hostname,
      logs: [],
      files: [],
      createdAt: new Date(),
      completedAt: null,
    };
    this.jobs.set(id, job);
    return job;
  }

  async getExtractionJob(id: string): Promise<ExtractionJob | undefined> {
    return this.jobs.get(id);
  }

  async updateExtractionJob(id: string, updates: Partial<ExtractionJob>): Promise<ExtractionJob | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    
    const updatedJob = { ...job, ...updates };
    this.jobs.set(id, updatedJob);
    return updatedJob;
  }

  async getExtractionJobWithFiles(id: string): Promise<ExtractionJobWithFiles | undefined> {
    const job = this.jobs.get(id);
    if (!job) return undefined;

    const jsFiles = Array.from(this.jsFiles.values()).filter(file => file.jobId === id);
    return { ...job, jsFiles };
  }

  async getRecentJobs(limit = 10): Promise<ExtractionJob[]> {
    return Array.from(this.jobs.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);
  }

  async createJsFile(insertFile: InsertJsFile): Promise<JsFile> {
    const id = randomUUID();
    const file: JsFile = {
      ...insertFile,
      id,
      downloadedAt: new Date(),
      size: insertFile.size ?? null,
      jobId: insertFile.jobId ?? null,
      errorMessage: insertFile.errorMessage ?? null,
    };
    this.jsFiles.set(id, file);
    return file;
  }

  async updateJsFile(id: string, updates: Partial<JsFile>): Promise<JsFile | undefined> {
    const file = this.jsFiles.get(id);
    if (!file) return undefined;
    
    const updatedFile = { ...file, ...updates };
    this.jsFiles.set(id, updatedFile);
    return updatedFile;
  }

  async getJsFilesByJobId(jobId: string): Promise<JsFile[]> {
    return Array.from(this.jsFiles.values()).filter(file => file.jobId === jobId);
  }
}

export const storage = new MemStorage();
