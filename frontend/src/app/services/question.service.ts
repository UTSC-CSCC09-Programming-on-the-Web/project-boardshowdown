import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; // Add this import

export interface Question {
  id: number;
  questions: string;
  solutions: number;
}

export interface QuestionResponse {
  success: boolean;
  data: Question | Question[];
  count?: number;
  error?: string;
}

export interface CheckSolutionResult {
  extractedLatex: string;
  expected: number;
  feedback: string;
}

export interface AttemptResult {
  success: boolean;
  attempt: {
    id: number;
    user_id: number;
    question_id: number;
    is_correct: boolean;
    score: number;
    created_at: string;
  };
  isFirstAttempt: boolean;
  scoreAwarded: number;
  questionDifficulty: number;
  questionStats: {
    totalAttempts: number;
    successfulAttempts: number;
    unsuccessfulAttempts: number;
    successRate: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private apiUrl = `${environment.apiEndpoint}/api/question-bank`;
  private apiUrl2 = `${environment.apiEndpoint}/api/openai/check-solution-ai`;

  constructor(private http: HttpClient) {}

  getAllQuestions(): Observable<QuestionResponse> {
    return this.http.get<QuestionResponse>(this.apiUrl, { withCredentials: true });
  }

  getQuestionById(id: number): Observable<QuestionResponse> {
    return this.http.get<QuestionResponse>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  getRandomQuestion(): Observable<QuestionResponse> {
    return this.http.get<QuestionResponse>(`${this.apiUrl}/random`, { withCredentials: true });
  }

  createQuestion(question: string, solution: number): Observable<QuestionResponse> {
    return this.http.post<QuestionResponse>(this.apiUrl, {
      questions: question,
      solutions: solution
    }, { withCredentials: true });
  }

  updateQuestion(id: number, question: string, solution: number): Observable<QuestionResponse> {
    return this.http.put<QuestionResponse>(`${this.apiUrl}/${id}`, {
      questions: question,
      solutions: solution
    }, { withCredentials: true });
  }

  deleteQuestion(id: number): Observable<QuestionResponse> {
    return this.http.delete<QuestionResponse>(`${this.apiUrl}/${id}`, { withCredentials: true });
  }

  checkSolution(boardImage: string, questionId: number): Observable<CheckSolutionResult> {
    return this.http.post<CheckSolutionResult>(this.apiUrl2, {
      base64: boardImage,
      questionId
    }, { withCredentials: true });
  }

  createAttempt(userId: number, questionId: number, isCorrect: boolean): Observable<AttemptResult> {
    return this.http.post<AttemptResult>(`${environment.apiEndpoint}/api/leaderboard/create-attempt`, {
      userId,
      questionId,
      isCorrect
    }, { withCredentials: true });
  }

}
