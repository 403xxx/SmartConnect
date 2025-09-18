import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { URL } from 'url';
import { storage } from '../storage';
import { type LogEntry } from '@shared/schema';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36'
};

export class JSExtractor {
  private baseDownloadDir: string;

  constructor(baseDownloadDir = 'downloads') {
    this.baseDownloadDir = baseDownloadDir;
  }

  private safeFilename(name: string): string {
    name = decodeURIComponent(name);
    name = name.replace(/[:\\/<>?"|*]/g, '_');
    name = name.replace(/\s+/g, '_');
    if (!name) {
      name = "file";
    }
    return name;
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  private addLog(jobId: string, type: LogEntry['type'], message: string): void {
    // In a real implementation, you might want to emit events or use WebSockets
    // For now, we'll store logs in the job record
    const log: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message
    };
    
    // Update job with new log (this would be better with real-time updates)
    storage.getExtractionJob(jobId).then(job => {
      if (job) {
        const logs = Array.isArray(job.logs) ? [...job.logs, log] : [log];
        storage.updateExtractionJob(jobId, { logs });
      }
    });
  }

  private findJsUrls(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const urls: string[] = [];
    
    $('script[src]').each((_, element) => {
      const src = $(element).attr('src')?.trim();
      if (src) {
        try {
          const parsedUrl = new URL(src, baseUrl);
          if (parsedUrl.pathname.toLowerCase().endsWith('.js')) {
            urls.push(parsedUrl.toString());
          }
        } catch (error) {
          // Invalid URL, skip
        }
      }
    });

    // Remove duplicates
    return Array.from(new Set(urls));
  }

  public async extractJavaScript(jobId: string, url: string): Promise<void> {
    try {
      await storage.updateExtractionJob(jobId, { status: 'processing' });
      this.addLog(jobId, 'info', `Starting extraction for: ${url}`);

      // Ensure URL has protocol
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname;
      const outputDir = path.join(this.baseDownloadDir, domain);
      
      await this.ensureDirectoryExists(outputDir);
      this.addLog(jobId, 'info', `Created download directory: ${outputDir}`);

      // Fetch the main page
      this.addLog(jobId, 'info', `Fetching page: ${url}`);
      const response = await axios.get(url, {
        headers: DEFAULT_HEADERS,
        timeout: 20000,
      });

      // Save the main HTML page
      const htmlPath = path.join(outputDir, 'page.html');
      await fs.writeFile(htmlPath, response.data, 'utf-8');
      this.addLog(jobId, 'success', `Saved page HTML → ${htmlPath}`);

      // Find JavaScript URLs
      const jsUrls = this.findJsUrls(response.data, url);
      
      if (jsUrls.length === 0) {
        this.addLog(jobId, 'info', 'No external .js files found.');
        await storage.updateExtractionJob(jobId, { 
          status: 'completed',
          totalFiles: 0,
          completedAt: new Date()
        });
        return;
      }

      this.addLog(jobId, 'success', `Found ${jsUrls.length} .js files. Downloading...`);
      await storage.updateExtractionJob(jobId, { totalFiles: jsUrls.length });

      // Prepare combined file and manifest
      const combinedPath = path.join(outputDir, 'all_js_combined.txt');
      const manifestPath = path.join(outputDir, 'manifest.txt');
      
      let combinedContent = '';
      let manifestContent = `Source page: ${url}\nNumber of .js files: ${jsUrls.length}\n\n`;
      
      let successCount = 0;
      let totalSize = 0;

      // Download each JS file
      for (let i = 0; i < jsUrls.length; i++) {
        const jsUrl = jsUrls[i];
        const fileIndex = i + 1;
        
        this.addLog(jobId, 'progress', `[${fileIndex}/${jsUrls.length}] ${jsUrl}`);

        try {
          const jsResponse = await axios.get(jsUrl, {
            headers: DEFAULT_HEADERS,
            timeout: 20000,
            responseType: 'arraybuffer'
          });

          const content = jsResponse.data;
          const contentText = content.toString('utf-8');
          
          // Generate safe filename
          const originalFilename = path.basename(new URL(jsUrl).pathname) || `script_${fileIndex}.js`;
          const safeFilename = this.safeFilename(originalFilename);
          const localFilename = `${fileIndex.toString().padStart(3, '0')}_${safeFilename}`;
          const localPath = path.join(outputDir, localFilename);

          // Save individual file
          await fs.writeFile(localPath, content);
          
          // Create JS file record
          await storage.createJsFile({
            jobId,
            originalUrl: jsUrl,
            filename: localFilename,
            size: content.length,
            status: 'success',
            errorMessage: null
          });

          // Add to combined file
          combinedContent += '='.repeat(80) + '\n';
          combinedContent += `# FILE ${fileIndex}: ${jsUrl}\n`;
          combinedContent += `# HTTP STATUS: ${jsResponse.status}\n`;
          combinedContent += '='.repeat(80) + '\n\n';
          combinedContent += contentText;
          if (!contentText.endsWith('\n')) {
            combinedContent += '\n';
          }
          combinedContent += '\n\n';

          // Add to manifest
          manifestContent += `${fileIndex}\t${jsUrl}\tOK\t${localFilename}\n`;

          successCount++;
          totalSize += content.length;
          
          this.addLog(jobId, 'success', `    Saved → ${localFilename}`);

        } catch (error) {
          let errorMsg = 'Unknown error';
          let httpStatus = 'ERROR';
          
          if (error && typeof error === 'object' && 'response' in error) {
            const axiosError = error as any;
            if (axiosError.response?.status) {
              httpStatus = `HTTP ${axiosError.response.status}`;
              errorMsg = `HTTP ${axiosError.response.status} - ${axiosError.response.statusText || 'Request failed'}`;
            } else if (axiosError.message) {
              errorMsg = axiosError.message;
            }
          } else if (error instanceof Error) {
            errorMsg = error.message;
          }
          
          // Create failed JS file record
          await storage.createJsFile({
            jobId,
            originalUrl: jsUrl,
            filename: `failed_${fileIndex}.js`,
            size: null,
            status: 'failed',
            errorMessage: errorMsg
          });

          // Add to combined file
          combinedContent += '='.repeat(80) + '\n';
          combinedContent += `# FILE ${fileIndex}: ${jsUrl}\n`;
          combinedContent += `# HTTP STATUS: ${httpStatus}\n`;
          combinedContent += '='.repeat(80) + '\n\n';
          combinedContent += `/* ERROR fetching file: ${errorMsg} */\n\n`;

          // Add to manifest
          manifestContent += `${fileIndex}\t${jsUrl}\tERROR\t${errorMsg}\n`;

          this.addLog(jobId, 'error', `    Error: ${errorMsg}`);
        }
      }

      // Write combined and manifest files
      await fs.writeFile(combinedPath, combinedContent, 'utf-8');
      await fs.writeFile(manifestPath, manifestContent, 'utf-8');

      // Update job completion
      await storage.updateExtractionJob(jobId, {
        status: 'completed',
        successfulFiles: successCount,
        failedFiles: jsUrls.length - successCount,
        totalSize,
        completedAt: new Date()
      });

      this.addLog(jobId, 'success', `Done. Files saved in ${outputDir}`);

    } catch (error) {
      let errorMsg = 'Unknown error occurred';
      
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        if (axiosError.response?.status) {
          errorMsg = `HTTP ${axiosError.response.status} - ${axiosError.response.statusText || 'Request failed'} when fetching: ${url}`;
        } else if (axiosError.message) {
          errorMsg = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      this.addLog(jobId, 'error', `Extraction failed: ${errorMsg}`);
      
      await storage.updateExtractionJob(jobId, {
        status: 'failed',
        completedAt: new Date()
      });
    }
  }
}

export const jsExtractor = new JSExtractor();
