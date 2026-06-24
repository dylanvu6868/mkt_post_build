"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ChevronDown, ChevronUp, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface LabHistoryItem {
  id: string;
  tool_name: string;
  input_data: any;
  output_data: any;
  created_at: string;
}

export default function LabHistoryPage() {
  const router = useRouter();
  const [histories, setHistories] = useState<LabHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/lab/history");
      if (res.ok) {
        const data = await res.json();
        setHistories(data);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Bạn có chắc chắn muốn xoá bản ghi này?")) return;
    
    try {
      const res = await fetch(`/api/lab/history/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setHistories(prev => prev.filter(h => h.id !== id));
        toast.success("Bản ghi đã được xoá thành công.");
      } else {
        toast.error("Không thể xoá bản ghi này.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Có lỗi xảy ra.");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4 border-b border-border/50 pb-4">
        <button 
          onClick={() => router.push("/hub/lab")}
          className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Lịch sử Vitba Tool</h1>
          <p className="text-sm text-muted-foreground">Xem lại và quản lý các nội dung bạn đã tạo.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-muted-foreground">Đang tải lịch sử...</div>
      ) : histories.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border border-border/40">
          <p className="text-muted-foreground">Bạn chưa sử dụng công cụ nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {histories.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div 
                key={item.id} 
                className="bg-card border border-border/40 rounded-xl overflow-hidden transition-all hover:border-border/80"
              >
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer bg-card/50"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold uppercase">
                      {item.tool_name.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground capitalize">{item.tool_name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat('vi-VN', { 
                          hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' 
                        }).format(new Date(item.created_at))}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      title="Xoá"
                    >
                      <Trash2 size={18} />
                    </button>
                    <div className="p-2 text-muted-foreground">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-border/40 bg-background/50 space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Dữ liệu đầu vào:</h4>
                      <pre className="bg-secondary p-3 rounded-md text-xs overflow-auto max-h-60 text-secondary-foreground whitespace-pre-wrap">
                        {JSON.stringify(item.input_data, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Kết quả AI:</h4>
                      <pre className="bg-primary/5 border border-primary/20 p-3 rounded-md text-xs overflow-auto max-h-96 text-foreground whitespace-pre-wrap">
                        {JSON.stringify(item.output_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
