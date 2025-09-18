import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ExtractionJob, ExtractionJobWithFiles, LogEntry, JsFile } from "@shared/schema";
import { 
  Code, 
  Download, 
  Globe, 
  Terminal, 
  BarChart3, 
  FileCode, 
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Trash2,
  Expand,
  FolderOpen,
  Share2,
  RotateCcw,
  Eye,
  Info
} from "lucide-react";

export default function JSDownloader() {
  const [url, setUrl] = useState("");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current job details with polling when processing
  const { data: currentJob, isLoading: jobLoading } = useQuery<ExtractionJobWithFiles>({
    queryKey: ["/api/extraction-jobs", currentJobId],
    enabled: !!currentJobId,
    refetchInterval: (query) => {
      // Poll every 2 seconds if job is still processing
      const job = query.state.data;
      return job?.status === "processing" ? 2000 : false;
    },
  });

  // Create extraction job mutation
  const createJobMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/extraction-jobs", { url });
      return response.json() as Promise<ExtractionJob>;
    },
    onSuccess: (job) => {
      setCurrentJobId(job.id);
      toast({
        title: "Extraction Started",
        description: `Processing JavaScript files from ${new URL(job.url).hostname}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Extraction Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    
    let processedUrl = url.trim();
    if (!processedUrl.startsWith('http')) {
      processedUrl = 'https://' + processedUrl;
    }
    
    createJobMutation.mutate(processedUrl);
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatProcessingTime = (job: ExtractionJobWithFiles | undefined): string => {
    if (!job?.createdAt) return '-';
    const start = new Date(job.createdAt).getTime();
    const end = job.completedAt ? new Date(job.completedAt).getTime() : Date.now();
    const seconds = ((end - start) / 1000).toFixed(1);
    return `${seconds}s`;
  };

  const getProgressPercentage = (): number => {
    if (!currentJob) return 0;
    if (currentJob.status === 'completed' || currentJob.status === 'failed') return 100;
    if (currentJob.status === 'processing' && (currentJob.totalFiles || 0) > 0) {
      return Math.round((((currentJob.successfulFiles || 0) + (currentJob.failedFiles || 0)) / (currentJob.totalFiles || 1)) * 100);
    }
    return currentJob.status === 'processing' ? 25 : 0;
  };

  const getStatusInfo = () => {
    if (!currentJob) return { text: 'Ready', step: '0 of 0' };
    
    switch (currentJob.status) {
      case 'pending':
        return { text: 'Initializing...', step: 'Step 1 of 4' };
      case 'processing':
        const completed = (currentJob.successfulFiles || 0) + (currentJob.failedFiles || 0);
        if ((currentJob.totalFiles || 0) > 0) {
          return { 
            text: `Downloading JavaScript files (${completed}/${currentJob.totalFiles || 0})`, 
            step: 'Step 3 of 4' 
          };
        }
        return { text: 'Analyzing webpage...', step: 'Step 2 of 4' };
      case 'completed':
        return { text: 'Extraction completed successfully', step: 'Complete' };
      case 'failed':
        return { text: 'Extraction failed', step: 'Error' };
      default:
        return { text: 'Ready', step: '0 of 0' };
    }
  };

  const getFileStatusBadge = (file: JsFile) => {
    switch (file.status) {
      case 'success':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'timeout':
        return (
          <Badge variant="secondary">
            <AlertCircle className="w-3 h-3 mr-1" />
            Timeout
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
    }
  };

  const isProcessing = currentJob?.status === 'processing' || currentJob?.status === 'pending';
  const statusInfo = getStatusInfo();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Code className="text-primary" />
                JS Downloader
              </h1>
              <p className="text-muted-foreground mt-2">
                Automated Web Page JavaScript Extractor & Downloader
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" data-testid="button-help">
                <Info className="w-4 h-4 mr-2" />
                Help
              </Button>
              <Button variant="secondary" size="sm" data-testid="button-history">
                <RotateCcw className="w-4 h-4 mr-2" />
                History
              </Button>
            </div>
          </div>
        </header>

        {/* URL Input Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="text-primary" />
              Extract JavaScript Files
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Website URL</Label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      required
                      disabled={isProcessing}
                      data-testid="input-url"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!url.trim() || isProcessing}
                    className="min-w-max"
                    data-testid="button-extract"
                  >
                    {createJobMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Extract JS Files
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                <Info className="w-4 h-4 inline mr-1" />
                Enter a valid URL to extract and download all external JavaScript files from the webpage.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Progress Indicator */}
        {currentJob && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  {isProcessing ? (
                    <Loader2 className="text-primary animate-spin" />
                  ) : currentJob.status === 'completed' ? (
                    <CheckCircle className="text-green-600" />
                  ) : (
                    <XCircle className="text-destructive" />
                  )}
                  {currentJob.status === 'processing' ? 'Processing URL' : 
                   currentJob.status === 'completed' ? 'Extraction Complete' : 
                   'Processing Failed'}
                </h3>
                <span className="text-sm text-muted-foreground" data-testid="text-progress-step">
                  {statusInfo.step}
                </span>
              </div>
              <Progress value={getProgressPercentage()} className="mb-4" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span data-testid="text-status">{statusInfo.text}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {currentJob && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Results Panel */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Terminal className="text-primary" />
                      Extraction Logs
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" title="Clear logs" data-testid="button-clear-logs">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Copy logs" data-testid="button-copy-logs">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Expand/Collapse" data-testid="button-expand-logs">
                        <Expand className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto space-y-1">
                    {Array.isArray(currentJob.logs) && currentJob.logs.length > 0 ? (
                      currentJob.logs.map((log: LogEntry, index: number) => (
                        <div key={index} className="flex items-start gap-3 p-2 rounded hover:bg-background/50 transition-colors">
                          <span className={`font-bold ${
                            log.type === 'success' ? 'text-green-600' : 
                            log.type === 'error' ? 'text-red-600' : 
                            log.type === 'progress' ? 'text-blue-600' : 
                            'text-muted-foreground'
                          }`}>
                            {log.type === 'success' ? '[+]' : 
                             log.type === 'error' ? '[-]' : 
                             log.type === 'progress' ? '[•]' : 
                             '[i]'}
                          </span>
                          <span className="flex-1">{log.message}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No logs available yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats & Files Panel */}
            <div className="space-y-6">
              {/* Stats Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="text-primary" />
                    Extraction Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total JS Files Found</span>
                      <span className="font-semibold text-lg" data-testid="text-total-found">
                        {currentJob.totalFiles}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Successfully Downloaded</span>
                      <span className="font-semibold text-lg text-green-600" data-testid="text-successful">
                        {currentJob.successfulFiles}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Failed Downloads</span>
                      <span className="font-semibold text-lg text-red-600" data-testid="text-failed">
                        {currentJob.failedFiles}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total Size</span>
                      <span className="font-semibold" data-testid="text-total-size">
                        {formatFileSize(currentJob.totalSize)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Processing Time</span>
                      <span className="font-semibold" data-testid="text-processing-time">
                        {formatProcessingTime(currentJob)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Generated Files */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCode className="text-primary" />
                    Generated Files
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileCode className="w-4 h-4 text-primary" />
                        <div>
                          <div className="font-medium">all_js_combined.txt</div>
                          <div className="text-xs text-muted-foreground">Combined JS files</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" data-testid="button-download-combined">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileCode className="w-4 h-4 text-primary" />
                        <div>
                          <div className="font-medium">manifest.txt</div>
                          <div className="text-xs text-muted-foreground">File listing & status</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" data-testid="button-download-manifest">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileCode className="w-4 h-4 text-primary" />
                        <div>
                          <div className="font-medium">page.html</div>
                          <div className="text-xs text-muted-foreground">Source webpage</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" data-testid="button-download-html">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full" data-testid="button-open-folder">
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Open Download Folder
                    </Button>
                    <Button variant="secondary" className="w-full" data-testid="button-share-results">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Results
                    </Button>
                    <Button variant="secondary" className="w-full" onClick={() => {
                      if (currentJob?.url) {
                        setUrl(currentJob.url);
                      }
                    }} data-testid="button-extract-again">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Extract Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Detailed File List */}
        {currentJob && currentJob.jsFiles && currentJob.jsFiles.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="text-primary" />
                  Downloaded Files ({currentJob.domain})
                </CardTitle>
                <Button variant="secondary" data-testid="button-download-zip">
                  <Download className="w-4 h-4 mr-2" />
                  Download All as ZIP
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">#</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Filename</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Original URL</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Size</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-2 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {currentJob.jsFiles.map((file, index) => (
                      <tr key={file.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-file-${index}`}>
                        <td className="py-3 px-2 text-muted-foreground">
                          {(index + 1).toString().padStart(3, '0')}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {file.status === 'success' ? (
                              <FileCode className="w-4 h-4 text-primary" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-destructive" />
                            )}
                            <span className="font-mono text-sm">
                              {file.filename}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="max-w-xs truncate text-sm text-muted-foreground" title={file.originalUrl}>
                            {file.originalUrl}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-sm">
                          {formatFileSize(file.size)}
                        </td>
                        <td className="py-3 px-2">
                          {getFileStatusBadge(file)}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex gap-2">
                            {file.status === 'success' && (
                              <>
                                <Button variant="ghost" size="sm" title="Download" data-testid={`button-download-file-${index}`}>
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" title="View" data-testid={`button-view-file-${index}`}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {file.status === 'failed' && (
                              <>
                                <Button variant="ghost" size="sm" title="Retry" data-testid={`button-retry-file-${index}`}>
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" title="View Error" data-testid={`button-error-file-${index}`}>
                                  <Info className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
