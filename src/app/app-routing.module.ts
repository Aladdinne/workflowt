import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import {DesignerComponent} from "./pages/designer/designer.component";

const routes: Routes = [
  { path: 'designer', component: DesignerComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
