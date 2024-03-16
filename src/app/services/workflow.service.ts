import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Workflow } from 'src/app/entities/Workflow.entity';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private apiUrl = `${environment}/workflow`;

  constructor(private http: HttpClient) {}

  getWorkflows(): Observable<Workflow[]> {
    return this.http.get<Workflow[]>(`${this.apiUrl}/get/all`);
  }

  saveWorkflow(workflow: Workflow): Observable<Workflow> {
    return this.http.post<Workflow>(`${this.apiUrl}/save/bpmn`, workflow);
  }

  updateWorkflow(workflow: Workflow): Observable<any> {
    return this.http.put(`${this.apiUrl}/update/${workflow.id}`, workflow);
  }

  getWorkflow(id: string | undefined): Observable<Workflow> {
    return this.http.get<Workflow>(`${this.apiUrl}/get/bpmn/${id}`);
  }


}
