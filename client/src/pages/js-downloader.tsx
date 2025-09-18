import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ExtractionJob, ExtractionJobWithFiles } from "@shared/schema";
import { Download } from "lucide-react";

export default function JSDownloader() {
  const [url, setUrl] = useState("");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Poll job status until it's done
  const { data: currentJob } = useQuery<ExtractionJobWithFiles>({
    queryKey: ["/api/extraction-jobs", currentJobId],
    enabled: !!currentJobId,
    refetchInterval: (query) => {
      const job = query.state.data as ExtractionJobWithFiles | undefined;
      return job?.status === "processing" ? 2000 : false;
    },
  });

  // Create new extraction job
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
    onError: (error: any) => {
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
    if (!processedUrl.startsWith("http")) {
      processedUrl = "https://" + processedUrl;
    }

    createJobMutation.mutate(processedUrl);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>JavaScript Downloader</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <div className="flex-1">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <Button type="submit" disabled={createJobMutation.isPending}>
              Start
            </Button>
          </form>
        </CardContent>
      </Card>

      {currentJob && (
        <Card>
          <CardHeader>
            <CardTitle>
              Files from {new URL(currentJob.url).hostname}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentJob.files?.length ? (
              <div className="space-y-3">
                {currentJob.files.map((file) => {
                  const downloadUrl = `/downloads/${new URL(
                    currentJob.url
                  ).hostname}/${file.fileName}`;
                  return (
                    <Card key={file.id} className="p-3 flex items-center justify-between">
                      <span>{file.fileName}</span>
                      <Button asChild variant="outline" size="sm">
                        <a href={downloadUrl} download>
                          <Download className="mr-2 h-4 w-4" /> Download
                        </a>
                      </Button>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <p>No files extracted yet...</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
