import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ExamQ = { q: string; options: string[]; correct: number };
const EXAM_CUSTOM_KEY = "training_exam_custom";

export default function ExamPage() {
  const [questions, setQuestions] = useState<ExamQ[]>([]);
  const [answers, setAnswers] = useState<number[]>(Array(50).fill(-1));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXAM_CUSTOM_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setQuestions(parsed.slice(0, 50));
      }
    } catch {}
  }, []);

  const submit = () => {
    const correctCount = answers.reduce((acc, a, i) => acc + (questions[i] && a === questions[i].correct ? 1 : 0), 0);
    setSubmitted(true);
    setScore(correctCount);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Employee Exam" />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Card className="p-6 space-y-4">
          {questions.length === 0 && (
            <div className="text-sm text-muted-foreground">No questions found. Open Exam Admin to seed the 50-question exam.</div>
          )}
          {questions.map((q, qi) => (
            <Card key={qi} className="p-4">
              <div className="font-medium mb-2">{qi + 1}. {q.q}</div>
              <div className="grid gap-2">
                {q.options.map((opt, oi) => (
                  <label key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`q-${qi}`} checked={answers[qi] === oi} onChange={() => setAnswers(prev => { const n = [...prev]; n[qi] = oi; return n; })} />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </Card>
          ))}
          <Button onClick={submit}>Submit Exam</Button>
          {submitted && (
            <div className="space-y-2 mt-4">
              <div className="text-lg">Result: {score}/50 correct</div>
              {score !== null && score >= 38 ? (
                <div className="text-green-600">Pass</div>
              ) : (
                <div className="text-destructive">Did not meet 75% threshold.</div>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
