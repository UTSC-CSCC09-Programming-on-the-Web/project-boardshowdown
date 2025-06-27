import {
  Component,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  ElementRef
} from '@angular/core';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Excalidraw } from '@excalidraw/excalidraw';

@Component({
  selector: 'app-excalidraw',
  template: `<div #host style="width:100%; height:100vh;"></div>`,
  styles: []
})
export class ExcalidrawComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;
  private reactRoot!: Root;

  ngAfterViewInit() {
    this.reactRoot = createRoot(this.host.nativeElement);
    this.reactRoot.render(React.createElement(Excalidraw));
  }

  ngOnDestroy() {
    this.reactRoot.unmount();
  }
}
