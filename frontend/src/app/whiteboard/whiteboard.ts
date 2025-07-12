// src/app/app.component.ts
import { Component, OnInit }             from '@angular/core';
import { FormsModule }           from '@angular/forms';
import { CommonModule }          from '@angular/common';
import { HttpClientModule }      from '@angular/common/http';
import {
  NgWhiteboardComponent,
  NgWhiteboardService,
  WhiteboardElement,
  WhiteboardOptions,
  ToolType,
  FormatType,
  LineJoin,
  LineCap,
  ElementType
} from 'ng-whiteboard';
import * as Y from 'yjs';
import { environment } from '../../environments/environment';
import { WebsocketProvider } from 'y-websocket';
import { QuestionService, Question, CheckSolutionResult } from '../services/question.service';

//deploy 7x
@Component({
  selector: 'app-whiteboard',
  imports: [NgWhiteboardComponent, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './whiteboard.html',
  styleUrls: ['./whiteboard.css']
})
export class WhiteboardComponent implements OnInit {

   showFeedbackModal = false;
  feedback: {
    icon: string;
    status: string;
    message: string;
    correctAnswer: string;
  } = {
    icon: '',
    status: '',
    message: '',
    correctAnswer: ''
  };

  openFeedbackModal(feedbackData: typeof this.feedback) {
    this.feedback = feedbackData;
    this.showFeedbackModal = true;
  }

  closeFeedbackModal() {
    this.showFeedbackModal = false;
  }

  onSubmitAnswer() {
    this.wb.save(this.FormatType.Base64, 'Board');

    if (!this.currentQuestion) {
      console.error('No question selected');
      return;
    }

    setTimeout(() => {
      if (!this.lastSvgBase64) {
        console.error('Board export failed');
        return;
      }
      this.submitPayload(this.lastSvgBase64);
    }, 50);

    console.log('Submitting answer for question ID:', this.currentQuestion.id);
  }

onSave(svgBase64: string) {
  this.lastSvgBase64 = svgBase64;
}

private submitPayload(boardImage: string) {
    console.log('Submitting board image:', boardImage);

    if (!this.currentQuestion) {
      console.error('No question selected');
      return;
    }

    console.log('Checking solution for question ID:', this.currentQuestion.id);
    // show spinner or initial modal state if you like
    //this.openFeedbackModal(this.feedback);

    this.questionService
      .checkSolution(boardImage, this.currentQuestion.id)
      .subscribe({
        next: (data: CheckSolutionResult) => {
          const raw = data.feedback.trim();
          const isCorrect = raw.startsWith('✅');
          const icon = raw.charAt(0);
          const message = raw.slice(1).trim();

          this.feedback = {
            icon,
            status: isCorrect ? 'Correct' : 'Incorrect',
            message,
            correctAnswer: data.expected.toString(),
          };

          this.openFeedbackModal(this.feedback);
        },
        error: err => {
          console.error('Check failed:', err);
          // optionally show an error state in your modal
        }
      });
  }


exportLatex() {
  this.wb.save(this.FormatType.Base64, 'Board');

    setTimeout(() => {
      if (!this.lastSvgBase64) {
        console.error('Board export failed');
        return;
      }
      this.exportLatexCall(this.lastSvgBase64);
    }, 50);


  this.wb.save(this.FormatType.Base64, 'Board');
  console.log('Exporting LaTeX...');
  if (!this.lastSvgBase64) {
    console.error('No SVG data available to export');
    return;
  }
}
exportLatexCall(boardImage: string) {
  fetch(`${environment.apiEndpoint}/analyze-svg`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64: boardImage }),
    credentials: 'include'
})
  .then(response => response.json())
  .then(data => {
    const latex = data.response.trim();
    console.log(latex);
    // copy it directly from the console and paste into .tex
    const blob = new Blob([latex], { type: 'text/plain' });

    // Create a temporary download link
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = 'LaTeX_Answer.tex';  // name of the downloaded file

    // Programmatically click it to trigger download
    document.body.appendChild(a); // needed for Firefox
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

  // —— state & bindings ——

  lastSvgBase64: string | null = null;

  selectedTool: ToolType  = ToolType.Pen;
  options: WhiteboardOptions = {};
  data: WhiteboardElement[] = []

  // Question sidebar properties
  questionSidebarOpen = false;
  questions: Question[] = [];
  currentQuestion: Question | null = null;
  loadingQuestions = false;
  questionError: string | null = null;

  private ydoc = new Y.Doc();
  private provider = new WebsocketProvider(environment.yjsWebsocketUrl, 'whiteboardd-room', this.ydoc);
  private yarray = this.ydoc.getArray<WhiteboardElement>('canvas');

  // canvas & style settings
  canvasWidth        = 800;
  canvasHeight       = 800;
  fullScreen         = false;
  strokeColor        = '#333333';
  backgroundColor    = '#F8F9FA';
  fill               = 'transparent';
  strokeWidth        = 2;
  zoom               = 1;
  fontFamily         = 'sans-serif';
  fontSize           = 24;
  enableGrid         = false;
  gridSize           = 10;
  snapToGrid         = false;
  lineJoin           = LineJoin.Miter;
  lineCap            = LineCap.Butt;
  dasharray          = '';
  dashoffset         = 0;

  // expose enums to template
  ToolType = ToolType;
  LineJoin = LineJoin;
  LineCap  = LineCap;
  FormatType = FormatType;

  constructor(private wb: NgWhiteboardService, private questionService: QuestionService) {}

  setTool(tool: ToolType)     { this.selectedTool = tool; this.wb.setActiveTool(tool); }
  undo()                      { this.wb.undo(); }
  redo()                      { this.wb.redo(); }
  clear()                     { this.wb.clear(); }
  save()                      { this.wb.save(this.FormatType.Base64, 'Board'); }
  toggleGrid()               { this.enableGrid = !this.enableGrid; }

  // Question sidebar methods
  toggleQuestionSidebar() {
    this.questionSidebarOpen = !this.questionSidebarOpen;
    if (this.questionSidebarOpen && this.questions.length === 0) {
      this.loadQuestions();
    }
  }

  loadQuestions() {
    this.loadingQuestions = true;
    this.questionError = null;
    this.questionService.getAllQuestions().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.questions = response.data;
        } else {
          this.questionError = 'Failed to load questions';
        }
        this.loadingQuestions = false;
      },
      error: (error) => {
        console.error('Error loading questions:', error);
        this.questionError = 'Failed to load questions';
        this.loadingQuestions = false;
      }
    });
  }

  selectQuestion(question: Question) {
    this.currentQuestion = question;
  }

  loadRandomQuestion() {
    this.loadingQuestions = true;
    this.questionService.getRandomQuestion().subscribe({
      next: (response) => {
        if (response.success && !Array.isArray(response.data)) {
          this.currentQuestion = response.data;
        } else {
          this.questionError = 'Failed to load random question';
        }
        this.loadingQuestions = false;
      },
      error: (error) => {
        console.error('Error loading random question:', error);
        this.questionError = 'Failed to load random question';
        this.loadingQuestions = false;
      }
    });
  }

  trackByQuestionId(index: number, question: Question): number {
    return question.id;
  }

  onReady()                   { console.log('Whiteboard ready!'); }


ngOnInit(): void {
  //this.data = this.yarray.toArray();
  this.yarray.observe(() => {
  const elements = this.yarray.toArray();
  this.data = elements;
});


}

onDataChange(d: WhiteboardElement[]) {
 this.overrideCanvasData(d)

}

  overrideCanvasData(newElements: WhiteboardElement[]) {
    const currentElements = this.yarray.toArray() as WhiteboardElement[];

  const currentIds = new Set(currentElements.map(el => el.id));
  const newIds = new Set(newElements.map(el => el.id));

  const added = newElements.some(el => !currentIds.has(el.id));
  const removed = currentElements.some(el => !newIds.has(el.id));

  const hasChanges = added || removed;

  if (!hasChanges) {
    return;
  }

  this.yarray.delete(0, this.yarray.length);
  this.yarray.push(newElements);
}




}
