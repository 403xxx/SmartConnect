import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const extractionJobs = pgTable("extraction_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  totalFiles: integer("total_files").default(0),
  successfulFiles: integer("successful_files").default(0),
  failedFiles: integer("failed_files").default(0),
  totalSize: integer("total_size").default(0), // in bytes
  domain: text("domain").notNull(),
  logs: jsonb("logs").default([]),
  files: jsonb("files").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const jsFiles = pgTable("js_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").references(() => extractionJobs.id),
  originalUrl: text("original_url").notNull(),
  filename: text("filename").notNull(),
  size: integer("size"), // in bytes
  status: text("status").notNull(), // success, failed, timeout
  errorMessage: text("error_message"),
  downloadedAt: timestamp("downloaded_at"),
});

export const insertExtractionJobSchema = createInsertSchema(extractionJobs).pick({
  url: true,
});

export const insertJsFileSchema = createInsertSchema(jsFiles).pick({
  jobId: true,
  originalUrl: true,
  filename: true,
  size: true,
  status: true,
  errorMessage: true,
});

export type InsertExtractionJob = z.infer<typeof insertExtractionJobSchema>;
export type ExtractionJob = typeof extractionJobs.$inferSelect;
export type InsertJsFile = z.infer<typeof insertJsFileSchema>;
export type JsFile = typeof jsFiles.$inferSelect;

// Additional types for API responses
export type ExtractionJobWithFiles = ExtractionJob & {
  jsFiles: JsFile[];
};

export type LogEntry = {
  timestamp: string;
  type: 'success' | 'error' | 'info' | 'progress';
  message: string;
};

export type ExtractionStats = {
  totalFound: number;
  successful: number;
  failed: number;
  totalSize: string;
  processingTime: string;
};
