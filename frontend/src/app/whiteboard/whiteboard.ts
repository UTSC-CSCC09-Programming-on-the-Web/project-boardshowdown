// src/app/app.component.ts
import { Component, OnInit }             from '@angular/core';
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
  LineCap,
  ElementType
} from 'ng-whiteboard';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';


@Component({
  selector: 'app-whiteboard',
  imports: [NgWhiteboardComponent, CommonModule, FormsModule],
  templateUrl: './whiteboard.html',
})
export class WhiteboardComponent implements OnInit {
onSave($event: string) {

fetch('http://localhost:3000/analyze-svg', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ base64: $event }),
})
  .then(response => response.json())
  .then(result => {
    console.log('Res:', result);
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

  // —— state & bindings ——

  selectedTool: ToolType  = ToolType.Pen;
  options: WhiteboardOptions = {};
  data: WhiteboardElement[] = []

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

  constructor(private wb: NgWhiteboardService) {}

  setTool(tool: ToolType)     { this.selectedTool = tool; this.wb.setActiveTool(tool); }
  undo()                      { this.wb.undo(); }
  redo()                      { this.wb.redo(); }
  clear()                     { this.wb.clear(); }
  save()                      { this.wb.save(this.FormatType.Base64, 'Board'); }
  toggleGrid()               { this.enableGrid = !this.enableGrid; }

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
