import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NotePage } from './note.page';

const routes: Routes = [
  {
    path: '',
    component: NotePage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class NotePageRoutingModule {}
