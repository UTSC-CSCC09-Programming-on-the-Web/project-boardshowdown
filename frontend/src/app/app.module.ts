import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
// Import your standalone components:
import { AppComponent } from './app.component';
import { ExcalidrawComponent } from './features/excalidraw/excalidraw.component';

@NgModule({
  imports: [
    BrowserModule,
     ExcalidrawComponent, // Uncomment if the import above is fixed
  ],
  // No more declarations: []
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
