
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ExtractionJobWithFiles, ExtractionJob, LogEntry, JsFile } from "@shared/schema";
import { Code, Download, Globe, Terminal, Loader2, CheckCircle, XCircle, AlertCircle, FileCode, RotateCcw, Eye, Info } from "lucide-react";

export default function JSDownloader() {
  const [url, setUrl] = useState("");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: currentJob } = useQuery<ExtractionJobWithFiles>({
    queryKey: ["/api/extraction-jobs", currentJobId],
    enabled: !!currentJobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      return job?.status === "processing" ? 2000 : false;
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", "/api/extraction-jobs", { url });
      return response.json() as Promise<ExtractionJob>;
    },
    onSuccess: (job) => {
      setCurrentJobId(job.id);
      toast({ title: "Started", description: `Extracting from ${job.url}` });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    let processed = url.trim();
    if (!processed.startsWith("http")) processed = "https://" + processed;
    createJobMutation.mutate(processed);
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadFile = async (path: string, filename: string) => {
    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const isProcessing = currentJob?.status === "processing" || currentJob?.status === "pending";

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Code /> JS Downloader
          </h1>
          <p className="text-muted-foreground">Extract and download external JavaScript files</p>
        </header>

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe /> Enter URL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isProcessing}
                required
              />
              <Button type="submit" disabled={!url.trim() || isProcessing}>
                {createJobMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Start
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Progress */}
        {currentJob && (
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {isProcessing ? <Loader2 className="animate-spin text-primary" /> : currentJob.status === "completed" ? <CheckCircle className="text-green-600" /> : <XCircle className="text-destructive" />}
                <span className="font-medium">{currentJob.status}</span>
              </div>
              <Progress value={isProcessing ? 50 : 100} />
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {currentJob && currentJob.status === "completed" && (
          <>
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>Total Files: {currentJob.totalFiles}</div>
                <div>Success: {currentJob.successfulFiles}</div>
                <div>Failed: {currentJob.failedFiles}</div>
                <div>Total Size: {formatSize(currentJob.totalSize)}</div>
              </CardContent>
            </Card>

            {/* Generated Files */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={() => downloadFile(`/api/download/${currentJob.id}/combined`, "all_js_combined.txt")}>
                  <Download className="w-4 h-4 mr-2" /> Combined JS
                </Button>
                <Button onClick={() => downloadFile(`/api/download/${currentJob.id}/manifest`, "manifest.txt")}>
                  <Download className="w-4 h-4 mr-2" /> Manifest
                </Button>
                <Button onClick={() => downloadFile(`/api/download/${currentJob.id}/page`, "page.html")}>
                  <Download className="w-4 h-4 mr-2" /> Page HTML
                </Button>
                <Button onClick={() => downloadFile(`/api/download/${currentJob.id}/zip`, "all_files.zip")}>
                  <Download className="w-4 h-4 mr-2" /> All as ZIP
                </Button>
              </CardContent>
            </Card>

            {/* Individual Files */}
            {currentJob.jsFiles?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Downloaded Files</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {currentJob.jsFiles.map((file: JsFile, i: number) => (
                      <div key={file.id} className="flex items-center justify-between bg-muted p-2 rounded">
                        <span className="font-mono text-sm">{file.filename}</span>
                        {file.status === "success" ? (
                          <Button size="sm" variant="ghost" onClick={() => downloadFile(`/api/download/${currentJob.id}/file/${file.id}`, file.filename)}>
                            <Download className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Badge variant="destructive">Failed</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
