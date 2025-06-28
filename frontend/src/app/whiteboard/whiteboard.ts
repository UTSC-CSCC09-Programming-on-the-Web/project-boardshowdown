import { Component } from '@angular/core';
import { NgWhiteboardComponent } from 'ng-whiteboard';

@Component({
  selector: 'my-component',
  imports: [NgWhiteboardComponent],
  template: '<ng-whiteboard></ng-whiteboard>',
})
export class MyComponent {}