"use client";

import { useState } from "react";
import { Loader2, Image as ImageIcon, Video, Download, RefreshCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface GeneratedImage {
  id: number;
  prompt: string;
  base64: string;
  timestamp: number;
}

interface GeneratedVideo {
  id: number;
  prompt: string;
  url: string;
  timestamp: number;
}

export default function VitbaFramePage() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GeneratedImage[]>([]);

  // Video State
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoModel, setVideoModel] = useState("google/veo-3.1-generate-001");
  const [videoRatio, setVideoRatio] = useState("16:9");
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoStatusText, setVideoStatusText] = useState("");
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.error("Vui lòng nhập mô tả ảnh.");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/frame/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          size,
          model: "gpt-image-2"
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Có lỗi xảy ra khi tạo ảnh.");
      }

      const data = await res.json();
      
      const newImage: GeneratedImage = {
        id: Date.now(),
        prompt,
        base64: `data:image/png;base64,${data.b64_json}`,
        timestamp: Date.now()
      };

      setHistory([newImage, ...history]);
      toast.success("Tạo ảnh thành công!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!videoPrompt.trim()) {
      toast.error("Vui lòng nhập mô tả video.");
      return;
    }

    setIsVideoGenerating(true);
    setVideoStatusText("Đang khởi tạo tiến trình...");
    try {
      const res = await fetch("/api/frame/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoRatio,
          model: videoModel
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Có lỗi xảy ra khi tạo tiến trình video.");
      }

      const { operation_name } = await res.json();
      
      setVideoStatusText("Đang render (có thể mất 1-3 phút)...");
      
      const poll = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/frame/video/status/${encodeURIComponent(operation_name)}`);
          if (statusRes.ok) {
            const data = await statusRes.json();
            if (data.status === "completed") {
              clearInterval(poll);
              
              let finalUrl = data.b64_video;
              if (data.b64_video && !data.b64_video.startsWith("http")) {
                 finalUrl = `data:video/mp4;base64,${data.b64_video}`;
              }

              const newVideo: GeneratedVideo = {
                id: Date.now(),
                prompt: videoPrompt,
                url: finalUrl,
                timestamp: Date.now()
              };

              setVideoHistory(prev => [newVideo, ...prev]);
              setIsVideoGenerating(false);
              setVideoStatusText("");
              toast.success("Tạo video thành công!");
            }
          } else {
             // If error occurs during polling, we should probably stop
             const errData = await statusRes.json();
             console.error("Lỗi polling:", errData);
             clearInterval(poll);
             setIsVideoGenerating(false);
             setVideoStatusText("");
             toast.error(errData.detail || "Lỗi khi kiểm tra trạng thái video.");
          }
        } catch (e) {
          console.error("Polling error", e);
        }
      }, 15000); // 15 seconds

    } catch (error: any) {
      toast.error(error.message);
      setIsVideoGenerating(false);
      setVideoStatusText("");
    }
  };

  const handleDownloadImage = (base64Url: string, index: number) => {
    const a = document.createElement("a");
    a.href = base64Url;
    a.download = `vitba-frame-img-${index}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadVideo = (url: string, index: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `vitba-frame-vid-${index}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ImageIcon className="h-8 w-8 text-purple-500" />
          Vitba Frame
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sáng tạo hình ảnh và video chất lượng cao cho chiến dịch Marketing của bạn bằng sức mạnh AI.
        </p>
      </div>

      <Tabs defaultValue="image" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="image" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-purple-500 data-[state=active]:shadow-sm">
            <ImageIcon size={16} />
            Tạo Ảnh
          </TabsTrigger>
          <TabsTrigger value="video" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-purple-500 data-[state=active]:shadow-sm">
            <Video size={16} />
            Tạo Video
          </TabsTrigger>
        </TabsList>

        {/* IMAGE TAB */}
        <TabsContent value="image" className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500"></div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-500" />
                  Mô tả bức ảnh bạn muốn tạo
                </label>
                <Textarea
                  placeholder="Ví dụ: Một giỏ quà tặng gồm mỹ phẩm và nến thơm đặt trên bàn gỗ..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] resize-none bg-background/50 focus-visible:ring-purple-500/50 text-base"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="space-y-2 w-full sm:w-[200px]">
                  <label className="text-xs font-medium text-muted-foreground">Tỷ lệ khung hình</label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Chọn tỷ lệ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024x1024">Vuông (1024x1024)</SelectItem>
                      <SelectItem value="1024x1536">Dọc (1024x1536)</SelectItem>
                      <SelectItem value="1536x1024">Ngang (1536x1024)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleGenerateImage} 
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-medium"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tạo ảnh...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Tạo ngay
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {history.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-border/50">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <RefreshCcw size={18} className="text-purple-500" />
                Kết quả gần đây
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {history.map((img, idx) => (
                  <Card key={img.id} className="overflow-hidden group border-border/50 bg-card/50">
                    <div className="relative aspect-square w-full bg-muted/30 flex items-center justify-center">
                      <img 
                        src={img.base64} 
                        alt={img.prompt} 
                        className="object-contain w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="bg-white/20 hover:bg-white/30 text-white border-none"
                          onClick={() => handleDownloadImage(img.base64, idx)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Tải xuống
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground line-clamp-2" title={img.prompt}>
                        <span className="font-medium text-foreground">Prompt:</span> {img.prompt}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* VIDEO TAB */}
        <TabsContent value="video" className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500"></div>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-500" />
                  Mô tả Video muốn tạo
                </label>
                <Textarea
                  placeholder="Ví dụ: Một chú chó nhúng nhảy trên bãi biển lúc hoàng hôn..."
                  value={videoPrompt}
                  onChange={(e) => setVideoPrompt(e.target.value)}
                  className="min-h-[120px] resize-none bg-background/50 focus-visible:ring-purple-500/50 text-base"
                  disabled={isVideoGenerating}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="space-y-2 w-full sm:w-[250px]">
                  <label className="text-xs font-medium text-muted-foreground">Mô hình AI</label>
                  <Select value={videoModel} onValueChange={setVideoModel} disabled={isVideoGenerating}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Chọn Model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google/veo-3.1-generate-001">Google Veo 3.1 (Siêu nét)</SelectItem>
                      <SelectItem value="volcengine/doubao-seedance-1.5-pro">Seedance 1.5 Pro</SelectItem>
                      <SelectItem value="volcengine/doubao-seedance-2">Seedance 2 (Mới nhất)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 w-full sm:w-[150px]">
                  <label className="text-xs font-medium text-muted-foreground">Tỷ lệ</label>
                  <Select value={videoRatio} onValueChange={setVideoRatio} disabled={isVideoGenerating}>
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Chọn tỷ lệ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">Ngang (16:9)</SelectItem>
                      <SelectItem value="9:16">Dọc (9:16)</SelectItem>
                      <SelectItem value="1:1">Vuông (1:1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button 
                  onClick={handleGenerateVideo} 
                  disabled={isVideoGenerating || !videoPrompt.trim()}
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-medium"
                >
                  {isVideoGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {videoStatusText}
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4" />
                      Tạo Video
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {videoHistory.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-border/50">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <RefreshCcw size={18} className="text-purple-500" />
                Kết quả Video
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {videoHistory.map((vid, idx) => (
                  <Card key={vid.id} className="overflow-hidden group border-border/50 bg-card/50">
                    <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
                      <video 
                        src={vid.url} 
                        controls 
                        autoPlay 
                        loop
                        muted
                        className="object-contain w-full h-full"
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="bg-black/50 hover:bg-black/70 text-white border-none"
                          onClick={() => handleDownloadVideo(vid.url, idx)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground line-clamp-2" title={vid.prompt}>
                        <span className="font-medium text-foreground">Prompt:</span> {vid.prompt}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
