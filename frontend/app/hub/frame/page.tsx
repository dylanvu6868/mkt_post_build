"use client";

import { useState, useEffect } from "react";
import { Loader2, Image as ImageIcon, Download, RefreshCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/services/api";

interface GeneratedImage {
  id: number;
  prompt: string;
  base64: string;
  timestamp: number;
}

export default function VitbaFramePage() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [isGenerating, setIsGenerating] = useState(false);
  const [history, setHistory] = useState<GeneratedImage[]>([]);

  useEffect(() => {
    // Load image history
    api.get<any[]>("/api/lab/history?tool_name=frame_image")
      .then(data => {
        const mapped = data.map(item => ({
          id: item.id,
          prompt: item.input_data?.prompt || "Image",
          base64: `data:image/png;base64,${item.output_data?.b64_json}`,
          timestamp: new Date(item.created_at).getTime()
        }));
        setHistory(mapped);
      })
      .catch(console.error);
  }, []);

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      toast.error("Vui lòng nhập mô tả ảnh.");
      return;
    }

    setIsGenerating(true);
    try {
      const data = await api.post<any>("/api/frame/generate", {
        prompt,
        size,
        model: "bee/gpt-image-2"
      });
      
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

  const handleDownloadImage = (base64Url: string, index: number) => {
    const a = document.createElement("a");
    a.href = base64Url;
    a.download = `vitba-frame-img-${index}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ImageIcon className="h-8 w-8 text-primary" />
          Vitba Frame
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sáng tạo hình ảnh chất lượng cao cho chiến dịch Marketing của bạn bằng sức mạnh AI.
        </p>
      </div>

      <div className="space-y-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
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
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-medium"
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
              <RefreshCcw size={18} className="text-primary" />
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
      </div>
    </div>
  );
}
