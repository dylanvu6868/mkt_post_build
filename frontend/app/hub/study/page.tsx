"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle, XCircle, ArrowRight, Lightbulb, RefreshCw, ArrowLeft, Trophy, Video, FileText, Bookmark } from "lucide-react";
import { api } from "@/services/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Topic {
  id: string;
  name: string;
  description: string;
  total_questions: number;
}

interface Question {
  id: string;
  topic_id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  reference_type?: "youtube" | "article" | "none";
  reference_url?: string;
  reference_content?: string;
}

type ViewState = "topics" | "quiz" | "result";

export default function StudyLearningPlatform() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>("topics");
  
  // Data state
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  
  // Quiz state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  
  // Timer state
  const [useTimer, setUseTimer] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // Progress state (localStorage)
  const [progress, setProgress] = useState<Record<string, {completed: number, score: number}>>({});

  // Bookmark state
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false);

  // 1. Load Topics on mount
  useEffect(() => {
    api.get<Topic[]>("/api/study_questions/topics")
      .then(data => setTopics(data))
      .catch(err => console.error("Failed to load topics", err));
      
    api.get<{bookmarks: string[]}>("/api/study_questions/bookmarks")
      .then(res => setBookmarkedIds(new Set(res.bookmarks)))
      .catch(err => console.error("Failed to load bookmarks", err));
      
    // Load progress
    const saved = localStorage.getItem("vitba_study_progress");
    if (saved) {
      try {
        setProgress(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Save progress when it changes
  useEffect(() => {
    if (Object.keys(progress).length > 0) {
      localStorage.setItem("vitba_study_progress", JSON.stringify(progress));
    }
  }, [progress]);

  // 2. Start Topic
  const startTopic = async (topic: Topic) => {
    try {
      const data = await api.get<Question[]>(`/api/study_questions/questions/${topic.id}`);
      let filteredData = data;
      if (showOnlyBookmarked) {
        filteredData = data.filter(q => bookmarkedIds.has(q.id));
      }
      
      if (filteredData && filteredData.length > 0) {
        setQuestions(filteredData);
        setSelectedTopic(topic);
        setCurrentIndex(0);
        setSelectedOption(null);
        setIsRevealed(false);
        setScore(0);
        setUserAnswers([]);
        if (useTimer) setTimeLeft(60);
        setView("quiz");
      } else {
        alert(showOnlyBookmarked ? "Bạn chưa lưu câu hỏi nào trong chủ đề này!" : "Chủ đề này hiện chưa có câu hỏi nào!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi tải câu hỏi. Vui lòng thử lại sau.");
    }
  };

  // Timer Logic
  useEffect(() => {
    if (view === "quiz" && useTimer && timeLeft !== null && !isRevealed) {
      if (timeLeft === 0) {
        // Time's up -> auto reveal as wrong
        setSelectedOption(-1); // -1 means timeout/no answer
        setIsRevealed(true);
        setUserAnswers(prev => {
          const newAnswers = [...prev];
          newAnswers[currentIndex] = -1;
          return newAnswers;
        });
        return;
      }
      
      const timer = setInterval(() => {
        setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [view, useTimer, timeLeft, isRevealed, currentIndex]);

  // 3. Handle Answer Selection
  const handleSelectOption = (index: number) => {
    if (isRevealed) return; // Prevent changing answer
    setSelectedOption(index);
    setIsRevealed(true);
    
    setUserAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[currentIndex] = index;
      return newAnswers;
    });

    if (index === questions[currentIndex].correct_index) {
      setScore(prev => prev + 1);
    }
  };

  // 4. Next Question or Finish
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsRevealed(false);
      if (useTimer) setTimeLeft(60);
    } else {
      // Finish quiz
      if (selectedTopic) {
        setProgress(prev => ({
          ...prev,
          [selectedTopic.id]: {
            completed: questions.length,
            score: score + (selectedOption === questions[currentIndex].correct_index ? 1 : 0)
          }
        }));
      }
      setView("result");
    }
  };

  // 5. Toggle Bookmark
  const toggleBookmark = async (questionId: string) => {
    const isBookmarked = bookmarkedIds.has(questionId);
    setBookmarkedIds(prev => {
      const newSet = new Set(prev);
      if (isBookmarked) newSet.delete(questionId);
      else newSet.add(questionId);
      return newSet;
    });

    try {
      await api.post(`/api/study_questions/bookmarks/${questionId}`);
    } catch (e) {
      console.error("Lỗi toggle bookmark", e);
      setBookmarkedIds(prev => {
        const newSet = new Set(prev);
        if (isBookmarked) newSet.add(questionId);
        else newSet.delete(questionId);
        return newSet;
      });
    }
  };

  const currentQ = questions[currentIndex];

  // --- RENDER TOPICS ---
  if (view === "topics") {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Vitba Study
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Nền tảng rèn luyện tư duy và kiến thức Marketing thực chiến.
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-card border rounded-2xl p-3 px-5 shadow-sm justify-between">
              <div className="flex items-center gap-2">
                <Bookmark className={showOnlyBookmarked ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"} size={20} />
                <span className="text-sm font-semibold">Chỉ ôn tập câu đã lưu</span>
              </div>
              <button 
                onClick={() => setShowOnlyBookmarked(!showOnlyBookmarked)}
                className={`w-12 h-6 rounded-full transition-colors relative ml-2 ${showOnlyBookmarked ? 'bg-yellow-500' : 'bg-secondary'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${showOnlyBookmarked ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-card border rounded-2xl p-3 px-5 shadow-sm justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className={useTimer ? "text-red-500" : "text-muted-foreground"} size={20} />
                <span className="text-sm font-semibold text-red-500">Áp lực thời gian (60s)</span>
              </div>
              <button 
                onClick={() => setUseTimer(!useTimer)}
                className={`w-12 h-6 rounded-full transition-colors relative ml-2 ${useTimer ? 'bg-red-500' : 'bg-secondary'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${useTimer ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map(topic => {
            const topicProgress = progress[topic.id];
            const isCompleted = topicProgress?.completed === topic.total_questions;
            const percent = topicProgress ? Math.round((topicProgress.completed / topic.total_questions) * 100) : 0;
            
            return (
              <div 
                key={topic.id}
                onClick={() => startTopic(topic)}
                className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col h-full
                  ${isCompleted 
                    ? 'bg-green-50/50 border-green-200 hover:border-green-400 hover:shadow-md' 
                    : 'bg-card hover:shadow-lg hover:border-blue-300 hover:-translate-y-1'
                  }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                    <BookOpen size={24} />
                  </div>
                  {isCompleted && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                      <CheckCircle size={14} /> Hoàn thành
                    </span>
                  )}
                </div>
                
                <h3 className="text-xl font-bold mb-2">{topic.name}</h3>
                <p className="text-muted-foreground text-sm flex-grow mb-6">{topic.description}</p>
                
                <div className="space-y-2 mt-auto">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{topic.total_questions} câu hỏi</span>
                    <span className="font-medium text-blue-600">{percent}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- RENDER QUIZ ---
  if (view === "quiz" && currentQ) {
    const isCorrect = selectedOption === currentQ.correct_index;
    
    return (
      <div className="max-w-[1400px] mx-auto p-4 md:p-6 h-[calc(100vh-4rem)] flex flex-col animate-in fade-in duration-300">
        
        {/* Header Progress (Spans full width) */}
        <div className="flex items-center gap-4 mb-6 shrink-0">
          <button 
            onClick={() => setView("topics")}
            className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-grow space-y-2 max-w-3xl">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">{selectedTopic?.name}</span>
              <span>{currentIndex + 1} / {questions.length}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
          
          {useTimer && (
            <div className={`ml-4 px-4 py-1.5 rounded-full font-mono font-bold text-lg border-2 ${
              timeLeft !== null && timeLeft <= 10 ? 'border-red-500 text-red-600 animate-pulse' : 'border-blue-500 text-blue-600'
            }`}>
              {timeLeft !== null ? `00:${timeLeft.toString().padStart(2, '0')}` : '00:60'}
            </div>
          )}
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
          
          {/* LEFT PANE: Question & Options */}
          <div className="flex flex-col overflow-y-auto pr-2 custom-scrollbar">
            <div className="flex items-start justify-between gap-4 mb-6">
              <h2 className="text-xl md:text-2xl font-bold leading-tight flex-grow">
                {currentQ.question}
              </h2>
              <button 
                onClick={() => toggleBookmark(currentQ.id)}
                className={`p-2.5 rounded-full transition-all flex-shrink-0 ${bookmarkedIds.has(currentQ.id) ? 'bg-yellow-100 text-yellow-600 shadow-sm' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                title="Lưu câu hỏi này"
              >
                <Bookmark className={bookmarkedIds.has(currentQ.id) ? "fill-current" : ""} size={24} />
              </button>
            </div>

            <div className="space-y-3">
              {currentQ.options.map((option, idx) => {
                let optionClass = "border-border hover:border-blue-400 hover:bg-blue-50/50";
                let icon = null;

                if (isRevealed) {
                  if (idx === currentQ.correct_index) {
                    optionClass = "border-green-500 bg-green-50 text-green-900 shadow-sm";
                    icon = <CheckCircle className="text-green-500 shrink-0" size={20} />;
                  } else if (idx === selectedOption) {
                    optionClass = "border-red-500 bg-red-50 text-red-900";
                    icon = <XCircle className="text-red-500 shrink-0" size={20} />;
                  } else {
                    optionClass = "border-border opacity-50";
                  }
                } else if (selectedOption === idx) {
                  optionClass = "border-blue-500 bg-blue-50 text-blue-900";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isRevealed}
                    className={`w-full p-3 md:p-4 text-left rounded-xl border-2 transition-all duration-200 flex justify-between items-center gap-3 text-sm md:text-base font-medium ${optionClass}`}
                  >
                    <span>{option}</span>
                    {icon}
                  </button>
                );
              })}
            </div>
            
            {/* Action Button */}
            {isRevealed && (
              <div className="mt-6">
                <button
                  onClick={handleNext}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-base hover:bg-primary/90 flex items-center justify-center gap-2 shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  {currentIndex < questions.length - 1 ? "Câu tiếp theo" : "Xem kết quả"}
                  <ArrowRight size={20} />
                </button>
              </div>
            )}
          </div>

          {/* RIGHT PANE: Explanation & References */}
          <div className="flex flex-col overflow-y-auto pr-2 custom-scrollbar">
            {isRevealed ? (
              <div className="bg-card border rounded-2xl p-5 shadow-sm flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
                <div className={`p-4 rounded-xl mb-4 ${isCorrect ? 'bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20' : 'bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20'}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Lightbulb className={isCorrect ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'} size={20} />
                    <h3 className={`font-bold text-base ${isCorrect ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
                      {isCorrect ? "Chính xác!" : "Sai rồi!"}
                    </h3>
                  </div>
                  <p className={`text-sm leading-relaxed ${isCorrect ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                    {currentQ.explanation}
                  </p>
                </div>

                {/* Render Reference if available */}
                {currentQ.reference_type === "youtube" && currentQ.reference_url && (
                  <div className="flex-grow flex flex-col">
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground font-medium text-sm">
                      <Video size={16} />
                      <span>Video bài học liên quan</span>
                    </div>
                    <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border shadow-inner flex-grow">
                      <iframe 
                        src={currentQ.reference_url} 
                        className="w-full h-full" 
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  </div>
                )}

                {currentQ.reference_type === "article" && currentQ.reference_content && (
                  <div className="flex-grow flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 mb-2 text-muted-foreground font-medium text-sm">
                      <FileText size={16} />
                      <span>Tài liệu tham khảo</span>
                    </div>
                    <div className="bg-muted/30 p-4 rounded-xl border border-dashed border-muted-foreground/20 overflow-y-auto flex-grow max-h-[350px]">
                      <article className="prose prose-sm dark:prose-invert max-w-none text-[13px]">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {currentQ.reference_content}
                        </ReactMarkdown>
                      </article>
                    </div>
                  </div>
                )}
                
                {(!currentQ.reference_type || currentQ.reference_type === "none") && (
                  <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground/50 border-2 border-dashed border-border rounded-xl p-8 text-center bg-muted/10">
                    <BookOpen size={48} className="mb-4 opacity-20" />
                    <p>Không có tài liệu tham khảo bổ sung cho câu hỏi này.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:flex flex-col items-center justify-center h-full bg-muted/30 rounded-3xl border-2 border-dashed border-muted-foreground/20 text-muted-foreground/50 p-8 text-center">
                <Lightbulb size={64} className="mb-6 opacity-20" />
                <h3 className="text-xl font-semibold mb-2">Chờ đáp án</h3>
                <p>Hãy chọn một đáp án bên trái, hệ thống sẽ hiển thị lời giải chi tiết và tài liệu/video hướng dẫn tại đây.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER RESULT ---
  if (view === "result") {
    const accuracy = Math.round((score / questions.length) * 100);
    let message = "";
    if (accuracy === 100) message = "Tuyệt vời! Bạn là chuyên gia thực thụ.";
    else if (accuracy >= 80) message = "Rất tốt! Kiến thức của bạn rất vững.";
    else if (accuracy >= 50) message = "Khá khen! Hãy ôn tập thêm để giỏi hơn nhé.";
    else message = "Cố gắng lên! Học hỏi từ những lỗi sai là cách tốt nhất.";

    return (
      <div className="max-w-4xl mx-auto p-6 h-[calc(100vh-4rem)] flex flex-col items-center animate-in zoom-in-95 duration-500 py-10 overflow-hidden">
        <div className="flex-1 w-full overflow-y-auto custom-scrollbar flex flex-col items-center pr-4">
          <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner shrink-0">
            <Trophy size={48} />
          </div>
          
          <h2 className="text-3xl font-extrabold mb-2 text-foreground shrink-0">Hoàn thành xuất sắc!</h2>
          <p className="text-lg text-muted-foreground mb-8 shrink-0">
            Bạn vừa hoàn thành chủ đề <span className="font-bold text-foreground">{selectedTopic?.name}</span>
          </p>

          <div className="grid grid-cols-2 gap-6 w-full max-w-2xl mb-8 shrink-0">
            <div className="bg-card p-6 rounded-2xl border shadow-sm text-center">
              <p className="text-muted-foreground font-medium mb-2">Độ chính xác</p>
              <p className="text-5xl font-black text-blue-600">{accuracy}%</p>
            </div>
            <div className="bg-card p-6 rounded-2xl border shadow-sm text-center">
              <p className="text-muted-foreground font-medium mb-2">Số câu đúng</p>
              <p className="text-5xl font-black text-green-500">{score}<span className="text-2xl text-muted-foreground">/{questions.length}</span></p>
            </div>
          </div>

          <p className="text-lg font-medium mb-8 bg-secondary p-4 rounded-xl w-full max-w-2xl text-center shrink-0">
            {message}
          </p>

          {/* REVIEW INCORRECT ANSWERS */}
          {score < questions.length && (
            <div className="w-full text-left bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl p-6 mb-8 shrink-0">
              <h3 className="text-xl font-bold text-red-800 dark:text-red-400 mb-4 flex items-center gap-2">
                <XCircle size={24} /> Phân tích câu trả lời sai
              </h3>
              <div className="space-y-6">
                {questions.map((q, idx) => {
                  const userAnswer = userAnswers[idx];
                  if (userAnswer === q.correct_index) return null; // Only show wrong
                  
                  return (
                    <div key={q.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-red-100/50 dark:border-red-900/30">
                      <p className="font-bold text-foreground mb-3">{idx + 1}. {q.question}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 p-2.5 rounded-lg text-sm border border-red-200 dark:border-red-500/20">
                          <span className="font-bold">Bạn chọn:</span> {userAnswer >= 0 ? q.options[userAnswer] : "Không trả lời (Hết giờ)"}
                        </div>
                        <div className="bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 p-2.5 rounded-lg text-sm border border-green-200 dark:border-green-500/20">
                          <span className="font-bold">Đáp án đúng:</span> {q.options[q.correct_index]}
                        </div>
                      </div>

                      <div className="bg-blue-50/50 dark:bg-blue-500/10 p-3 rounded-lg text-sm text-foreground dark:text-blue-100">
                        <span className="font-bold text-blue-800 dark:text-blue-400">Giải thích: </span>
                        {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl mt-auto shrink-0 pb-10">
            <button
              onClick={() => startTopic(selectedTopic!)}
              className="flex-1 py-3 px-6 border-2 border-border hover:bg-secondary rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw size={18} /> Làm lại chủ đề
            </button>
            <button
              onClick={() => setView("topics")}
              className="flex-1 py-3 px-6 bg-foreground text-background hover:opacity-90 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
            >
              Về danh sách <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
