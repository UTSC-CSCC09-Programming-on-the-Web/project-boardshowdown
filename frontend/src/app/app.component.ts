// src/app/app.component.ts
import { Component }             from '@angular/core';
import { FormsModule }           from '@angular/forms';
import { CommonModule }          from '@angular/common';
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

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ CommonModule, FormsModule, NgWhiteboardComponent ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  // —— state & bindings ——  
  data: WhiteboardElement[] = [];
  selectedTool: ToolType  = ToolType.Pen;
  options: WhiteboardOptions = {};

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

  constructor(private wb: NgWhiteboardService) {}

  // —— toolbar actions ——  
  setTool(tool: ToolType)     { this.selectedTool = tool; this.wb.setActiveTool(tool); }
  undo()                      { this.wb.undo(); }
  redo()                      { this.wb.redo(); }
  clear()                     { this.wb.clear(); }
  save()                      { this.wb.save(this.FormatType.Base64, 'Board'); }
  toggleGrid()               { this.enableGrid = !this.enableGrid; }

  // —— lifecycle & data events ——  
  onReady()                   { console.log('Whiteboard ready!'); }
  onDataChange(d: WhiteboardElement[]) {
    this.data = d;
    console.log('Data changed:', d);
  }
}
