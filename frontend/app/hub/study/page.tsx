"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle, XCircle, ArrowRight, Lightbulb, RefreshCw, ArrowLeft, Trophy } from "lucide-react";

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
  
  // Progress state (localStorage)
  const [progress, setProgress] = useState<Record<string, {completed: number, score: number}>>({});

  // 1. Load Topics on mount
  useEffect(() => {
    fetch("/api/study_questions/topics")
      .then(res => res.json())
      .then(data => setTopics(data))
      .catch(err => console.error("Failed to load topics", err));
      
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
      const res = await fetch(`/api/study_questions/questions/${topic.id}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setQuestions(data);
        setSelectedTopic(topic);
        setCurrentIndex(0);
        setSelectedOption(null);
        setIsRevealed(false);
        setScore(0);
        setView("quiz");
      } else {
        alert("Chủ đề này hiện chưa có câu hỏi nào!");
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi tải câu hỏi. Vui lòng thử lại sau.");
    }
  };

  // 3. Handle Answer Selection
  const handleSelectOption = (index: number) => {
    if (isRevealed) return; // Prevent changing answer
    setSelectedOption(index);
    setIsRevealed(true);
    
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
      <div className="max-w-3xl mx-auto p-4 md:p-6 min-h-[80vh] flex flex-col animate-in fade-in duration-300">
        {/* Header Progress */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => setView("topics")}
            className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-grow space-y-2">
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
        </div>

        {/* Question Area */}
        <div className="flex-grow flex flex-col justify-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 leading-tight">
            {currentQ.question}
          </h2>

          <div className="space-y-4">
            {currentQ.options.map((option, idx) => {
              let optionClass = "border-border hover:border-blue-400 hover:bg-blue-50/50";
              let icon = null;

              if (isRevealed) {
                if (idx === currentQ.correct_index) {
                  optionClass = "border-green-500 bg-green-50 text-green-900 shadow-sm";
                  icon = <CheckCircle className="text-green-500 shrink-0" size={24} />;
                } else if (idx === selectedOption) {
                  optionClass = "border-red-500 bg-red-50 text-red-900";
                  icon = <XCircle className="text-red-500 shrink-0" size={24} />;
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
                  className={`w-full p-5 md:p-6 text-left rounded-2xl border-2 transition-all duration-200 flex justify-between items-center gap-4 text-lg font-medium ${optionClass}`}
                >
                  <span>{option}</span>
                  {icon}
                </button>
              );
            })}
          </div>

          {/* Explanation Block */}
          {isRevealed && (
            <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 animate-in slide-in-from-bottom-4 fade-in duration-500 shadow-sm">
              <div className="flex items-start gap-3">
                <Lightbulb className="text-amber-500 shrink-0 mt-1" size={24} />
                <div>
                  <h4 className="font-bold mb-2 flex items-center gap-2">
                    {isCorrect ? "Chính xác! Kiến thức cần nhớ:" : "Chưa chính xác! Kiến thức cần nhớ:"}
                  </h4>
                  <p className="text-amber-800/90 leading-relaxed text-lg">
                    {currentQ.explanation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Next Button */}
        {isRevealed && (
          <div className="mt-8 sticky bottom-6 z-10 animate-in fade-in duration-300">
            <button
              onClick={handleNext}
              className="w-full py-5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
            >
              {currentIndex === questions.length - 1 ? "Hoàn thành chủ đề" : "Câu tiếp theo"}
              <ArrowRight size={24} />
            </button>
          </div>
        )}
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
      <div className="max-w-2xl mx-auto p-6 min-h-[80vh] flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
        <div className="w-32 h-32 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-8 shadow-inner">
          <Trophy size={64} />
        </div>
        
        <h2 className="text-4xl font-extrabold mb-4 text-foreground">Hoàn thành xuất sắc!</h2>
        <p className="text-xl text-muted-foreground mb-8">
          Bạn vừa hoàn thành chủ đề <span className="font-bold text-foreground">{selectedTopic?.name}</span>
        </p>

        <div className="grid grid-cols-2 gap-6 w-full mb-10">
          <div className="bg-card p-6 rounded-2xl border shadow-sm">
            <p className="text-muted-foreground font-medium mb-2">Độ chính xác</p>
            <p className="text-5xl font-black text-blue-600">{accuracy}%</p>
          </div>
          <div className="bg-card p-6 rounded-2xl border shadow-sm">
            <p className="text-muted-foreground font-medium mb-2">Số câu đúng</p>
            <p className="text-5xl font-black text-green-500">{score}<span className="text-2xl text-muted-foreground">/{questions.length}</span></p>
          </div>
        </div>

        <p className="text-xl font-medium mb-12 bg-secondary p-4 rounded-xl w-full">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button
            onClick={() => startTopic(selectedTopic!)}
            className="flex-1 py-4 px-6 border-2 border-border hover:bg-secondary rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw size={20} /> Làm lại chủ đề này
          </button>
          <button
            onClick={() => setView("topics")}
            className="flex-1 py-4 px-6 bg-foreground text-background hover:opacity-90 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all"
          >
            Về danh sách chủ đề <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
