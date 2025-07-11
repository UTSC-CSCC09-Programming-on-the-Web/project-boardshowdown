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

@Injectable({
  providedIn: 'root'
})
export class QuestionService {
  private apiUrl = `${environment.apiEndpoint}/api/question-bank`;
  private apiUrl2 = `${environment.apiEndpoint}/check-solution-ai`;

  constructor(private http: HttpClient) {}

  getAllQuestions(): Observable<QuestionResponse> {
    return this.http.get<QuestionResponse>(this.apiUrl);
  }

  getQuestionById(id: number): Observable<QuestionResponse> {
    return this.http.get<QuestionResponse>(`${this.apiUrl}/${id}`);
  }

  getRandomQuestion(): Observable<QuestionResponse> {
    return this.http.get<QuestionResponse>(`${this.apiUrl}/random`);
  }

  createQuestion(question: string, solution: number): Observable<QuestionResponse> {
    return this.http.post<QuestionResponse>(this.apiUrl, {
      questions: question,
      solutions: solution
    });
  }

  updateQuestion(id: number, question: string, solution: number): Observable<QuestionResponse> {
    return this.http.put<QuestionResponse>(`${this.apiUrl}/${id}`, {
      questions: question,
      solutions: solution
    });
  }

  deleteQuestion(id: number): Observable<QuestionResponse> {
    return this.http.delete<QuestionResponse>(`${this.apiUrl}/${id}`);
  }

  checkSolution(boardImage: string, questionId: number): Observable<CheckSolutionResult> {
    return this.http.post<CheckSolutionResult>(this.apiUrl2, {
      base64: boardImage,
      questionId
    });
  }

}
