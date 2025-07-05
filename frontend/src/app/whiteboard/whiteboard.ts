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
import { WebsocketProvider } from 'y-websocket';
import { QuestionService, Question } from '../services/question.service';


@Component({
  selector: 'app-whiteboard',
  imports: [NgWhiteboardComponent, CommonModule, FormsModule, HttpClientModule],
  templateUrl: './whiteboard.html',
  styleUrls: ['./whiteboard.css']
})
export class WhiteboardComponent implements OnInit {
onSave($event: string) {

fetch('http://localhost:3000/analyze-svg', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ base64: $event }),
})
  .then(response => response.json())
  .then(data => {
    // `data.response` is already an un-escaped JS string:
    const latex = data.response.trim();
    console.log(latex);      // logs: \int_{0}^{\infty} 1 \, dx
    // now you can copy it directly from the console and paste into your .tex
    const blob = new Blob([latex], { type: 'text/plain' });

    // 3) Create a temporary download link
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = 'LaTeX_Answer.tex';  // name of the downloaded file

    // 4) Programmatically click it to trigger download
    document.body.appendChild(a); // needed for Firefox
    a.click();

    // 5) Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

  // —— state & bindings ——

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
  private provider = new WebsocketProvider('ws://localhost:12345', 'whiteboardd-room', this.ydoc);
  private yarray = this.ydoc.getArray<WhiteboardElement>('canvas');

  // canvas & style settings
  canvasWidth        = 8000;
  canvasHeight       = 6000;
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
