// src/app/app.component.ts
import { Component, OnInit, OnDestroy, Input, SimpleChanges, OnChanges } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule }           from '@angular/forms';
import { CommonModule }          from '@angular/common';
import { Subscription } from 'rxjs';
import {
  NgWhiteboardComponent,
  NgWhiteboardService,
  WhiteboardElement,
  WhiteboardOptions,
  ToolType,
  FormatType,
  LineJoin,
  LineCap
} from 'ng-whiteboard';
import * as Y from 'yjs';
import { environment } from '../../environments/environment';
import { WebsocketProvider } from 'y-websocket';
import { QuestionService, Question, CheckSolutionResult, AttemptResult } from '../services/question.service';
import { HeaderComponent } from '../header/header.component';
import { GoogleAuth } from '../google-auth';
import { ScoreService } from '../services/leaderboard.service';
import { RoomService, RoomParticipant } from '../services/room.service';

@Component({
  selector: 'app-whiteboard',
  standalone: true,
  imports: [NgWhiteboardComponent, CommonModule, FormsModule, HeaderComponent],
  templateUrl: './whiteboard.html',
  styleUrls: ['./whiteboard.css']
})
export class WhiteboardComponent implements OnInit, OnDestroy, OnChanges {
  @Input() yjsRoom: string = 'whiteboardd-room';

  // Room participants
  participants: RoomParticipant[] = [];
  participantCount = 0;

   showFeedbackModal = false;
   loading = false;
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

  sleep5 = () => new Promise(resolve => setTimeout(resolve, 5000));

  onSubmitAnswer() {
    this.wb.save(this.FormatType.Base64, 'Board');

    if (!this.currentQuestion) {
      console.error('No question selected');
      // Optionally show an error message to the user
      this.loading = false;
      this.openFeedbackModal({
        icon: '❌',
        status: 'Error',
        message: 'No question selected. Please select a question before submitting.',
        correctAnswer: 'unknown'
      });
      return;
    }

    // Current user received from google auth
    this.googleAuth.getUserInfo().subscribe({
      next: (userInfo) => {
        console.log('Current user info:', userInfo);

        setTimeout(() => {
          this.loading = true;
          if (!this.lastSvgBase64) {
            console.error('Board export failed');
            this.loading = false;
            return;
          }
          // sleep for 5 seconds
          // before submitting the answer

          this.submitPayload(this.lastSvgBase64, userInfo);

        }, 5);
      },
      error: (error) => {
        console.error('Failed to get user info:', error);
        this.loading = false;
      }
    });

    console.log('Submitting answer for question ID:', this.currentQuestion.id);
  }

onSave(svgBase64: string) {
  this.lastSvgBase64 = svgBase64;
}

private submitPayload(boardImage: string, userInfo: any) {

    if (!this.currentQuestion) {
      console.error('No question selected');
      return;
    }

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

          // Create attempt record with user info
          if (userInfo && userInfo.id && this.currentQuestion) {
            this.questionService
              .createAttempt(userInfo.id, this.currentQuestion.id, isCorrect)
              .subscribe({
                next: (attemptResult: AttemptResult) => {
                  console.log('Attempt record created:', attemptResult);
                  console.log(`Question difficulty: ${attemptResult.questionDifficulty}`);
                  console.log(`Question stats:`, attemptResult.questionStats);
                  if (attemptResult.isFirstAttempt) {
                    console.log(`First attempt - score awarded: ${attemptResult.scoreAwarded} points`);
                    console.log(`Dynamic score based on ${attemptResult.questionStats.successfulAttempts} successful and ${attemptResult.questionStats.unsuccessfulAttempts} unsuccessful attempts (${attemptResult.questionStats.successRate}% success rate)`);

                    // Update leaderboard if user scored points
                    if (attemptResult.scoreAwarded > 0) {
                      this.scoreService.updateLeaderboard();
                    }
                  } else {
                    console.log('Retry attempt - no score awarded');
                  }
                },
                error: (attemptError) => {
                  console.error('Failed to create attempt record:', attemptError);
                }
              });
          }

          this.openFeedbackModal(this.feedback);
        },
        error: err => {
          console.error('Check failed:', err);
          // optionally show an error state in your modal
          this.loading = false; // hide spinner or reset modal state
        },
        complete: () => {
          this.loading = false; // hide spinner or reset modal state
        }
      });
  }


exportLatex() {
  this.loading = true;
  this.wb.save(this.FormatType.Base64, 'Board');

    setTimeout(() => {
      if (!this.lastSvgBase64) {
        console.error('Board export failed');
        this.loading = false;
        return;
      }
      this.exportLatexCall(this.lastSvgBase64);
    }, 50);
}

exportLatexCall(boardImage: string) {
  fetch(`${environment.apiEndpoint}/api/openai/analyze-svg`, {
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
  })
  .finally(() => {
    this.loading = false; // hide spinner or reset modal state
    // give some feedback to the user

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
  private provider!: WebsocketProvider;
  private yarray!: Y.Array<WhiteboardElement>;
  private participantsSubscription?: Subscription;

  constructor(
    private wb: NgWhiteboardService,
    private questionService: QuestionService,
    private route: ActivatedRoute,
    private googleAuth: GoogleAuth,
    private scoreService: ScoreService,
    private roomService: RoomService
  ) {}

  ngOnInit(): void {
    this.yjsRoom = this.route.snapshot.paramMap.get('room') || 'whiteboardd-room';
    this.initYjsProvider();
    this.initRoomMonitoring();
  }

  ngOnDestroy(): void {
    this.cleanupRoom();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['yjsRoom'] && !changes['yjsRoom'].firstChange) {
      this.cleanupRoom();
      this.initYjsProvider();
      this.initRoomMonitoring();
    }
  }

  private cleanupRoom() {
    // Stop room monitoring
    this.roomService.stopRoomMonitoring();

    // Unsubscribe from participants
    if (this.participantsSubscription) {
      this.participantsSubscription.unsubscribe();
      this.participantsSubscription = undefined;
    }

    // Cleanup YJS provider
    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
    }

    // Clear YJS document
    if (this.ydoc) {
      this.ydoc.destroy();
    }

    console.log('Cleaned up room resources');
  }

  private initRoomMonitoring() {
    // Start monitoring this room
    this.roomService.startRoomMonitoring(this.yjsRoom);

    // Subscribe to participant updates for this specific room
    this.participantsSubscription = this.roomService.participants$.subscribe(participants => {
      this.participants = participants;
      this.participantCount = participants.length;
      console.log(`Room ${this.yjsRoom} now has ${this.participantCount} participants`);
    });
  }

  private initYjsProvider() {
    // Create new YJS document for this room
    this.ydoc = new Y.Doc();

    // Create new WebSocket provider for this specific room
    this.provider = new WebsocketProvider(
      environment.yjsWebsocketUrl,
      this.yjsRoom,
      this.ydoc
    );

    // Get the canvas array for this room's document
    this.yarray = this.ydoc.getArray<WhiteboardElement>('canvas');

    // Observe changes to the canvas array
    this.yarray.observe(() => {
      this.data = this.yarray.toArray();
    });

    // Initialize with existing data
    this.data = this.yarray.toArray();

    console.log('Yjs provider initialized for room:', this.yjsRoom);
  }

  // canvas & style settings
  canvasWidth        = 900;
  canvasHeight       = 850;
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