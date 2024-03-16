import {Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Subscription} from 'rxjs';

// @ts-ignore
import Modeler from "bpmn-js/lib/Modeler";
// @ts-ignore
import propertiesPanelModule from "bpmn-js-properties-panel";
// @ts-ignore
import propertiesProviderModule from "bpmn-js-properties-panel/lib/provider/camunda";

import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
import "bpmn-js-properties-panel/dist/assets/bpmn-js-properties-panel.css";

// @ts-ignore
import * as camundaModdleDescriptor from 'camunda-bpmn-moddle/resources/camunda.json';
import Swal from 'sweetalert2';
// import {DialogWorkflowComponent} from '../dialog/dialog-workflow/dialog-workflow.component';
import {Workflow} from 'src/app/entities/Workflow.entity';
import {MatDialog} from '@angular/material/dialog';
import {WorkflowService} from 'src/app/services/workflow.service';

@Component({
  selector: 'app-designer',
  templateUrl: './designer.component.html',
  styleUrls: ['./designer.component.css']
})
export class DesignerComponent implements OnInit, OnDestroy {
  title = 'Workflow Modeler';
  modeler: Modeler;

  @ViewChild('canvas')
  private canvasRef!: ElementRef;
  private workflow!: Workflow;
  isUpdate!: boolean;
  dialogOpen: boolean = false;
  loading: boolean = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private http: HttpClient,
    public dialog: MatDialog,
    private workflowService: WorkflowService
  ) {
  }

  ngOnInit(): void {
    this.modeler = new Modeler({
      container: '#canvas',
      width: '100%',
      height: '600px',
      propertiesPanel: {
        parent: '#properties'
      },
      additionalModules: [
        propertiesPanelModule,
        propertiesProviderModule
      ],
      moddleExtensions: {
        camunda: camundaModdleDescriptor
      }
    });

    this.workflow = history.state.workflow;
    this.isUpdate = history.state.isUpdate ?? false;

    if (this.workflow) {
      this.loadWorkflow();
    } else {
      this.createNewWorkflow();
    }
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    if (this.modeler) {
      this.modeler.destroy();
    }
    if (this.dialog.openDialogs.length) {
      this.dialog.closeAll();
    }
  }

  createNewWorkflow() {
    this.modeler.createDiagram().then(() => {
      this.zoomToFit();
    }).catch((error: any) => {
      console.error('Error creating diagram', error);
    });
  }

  async onSaveClick() {
    if (this.dialogOpen) {
      return; // Do nothing if the dialog is already open
    }
    this.dialogOpen = true;
    const dialogRef = this.dialog.open(DesignerComponent, {
      data: {workflowName: '', xmlName: ''}
    });

    try {
      const result = await dialogRef.afterClosed().toPromise();
      this.dialogOpen = false;

      if (result) {
        const {xml} = await this.modeler.saveXML({format: true});
        console.log('Saved BPMN XML:', xml);

        const workflow: Workflow = {
          name: result.workflowName,
          xmlContent: xml,
          xmlName: result.xmlName + '.bpmn',
          deploymentId: '',
          id: ''
        };

        this.loading = true;

        // Send an HTTP request to save the workflow in your database
        const savedWorkflow = await this.workflowService.saveWorkflow(workflow).toPromise();

        this.loading = false;

        console.log('Workflow saved:', savedWorkflow);

        Swal.fire({
          position: 'center',
          icon: 'success',
          title: 'The BPMN was saved successfully!',
          showConfirmButton: false,
          timer: 1500
        });
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async loadWorkflow() {
    try {
      const workflow = await this.workflowService.getWorkflow(this.workflow.id).toPromise();
      // @ts-ignore
      const xml = workflow.xmlContent; // Assuming the XML content property name is xmlContent
      await this.modeler.importXML(xml);
      this.zoomToFit();
    } catch (err) {
      this.handleError(err);
    }
  }


  async onUpdateClick(): Promise<void> {
    if (!this.workflow) {
      console.error('Workflow not found.');
      return;
    }

    try {
      const {xml} = await this.modeler.saveXML({format: true});
      this.workflow.xmlContent = xml;
      const updatedWorkflow = await this.workflowService.updateWorkflow(this.workflow).toPromise();
      console.log('Workflow saved:', updatedWorkflow);
      Swal.fire({
        position: 'center',
        icon: 'success',
        title: 'The BPMN is updated successfully!',
        html: 'NOTE: now you can start the <i>latest</i> version of the process',
        showConfirmButton: false,
        timer: 2500
      });
    } catch (error:any) {
      console.error('Error saving workflow:', error);
      if (error.error && error.error.message) {
        Swal.fire({
          position: 'center',
          icon: 'error',
          title: error.error.message,
          showConfirmButton: false,
          timer: 1500
        });
      } else {
        Swal.fire({
          position: 'center',
          icon: 'error',
          title: 'An error occurred while saving the workflow.',
          showConfirmButton: false,
          timer: 2500
        });
      }
    }
  }


  onDownloadClick(): void {
    this.modeler.saveXML({format: true}, (err: any, xml: string) => {
      if (err) {
        this.handleError(err);
      } else {
        const blob = new Blob([xml], {type: 'application/xml'});
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.download = 'process.bpmn';
        anchor.href = url;
        anchor.click();
        window.URL.revokeObjectURL(url);
      }
    });
  }

  private handleError(err: any) {
    this.loading = false;
    console.error('Error:', err);

    let errorMessage = 'An error occurred.';
    if (err.error && err.error.message) {
      errorMessage = err.error.message;
    }

    Swal.fire({
      position: 'center',
      icon: 'error',
      title: errorMessage,
      showConfirmButton: false,
      timer: 2500
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const xmlContent = e.target?.result as string;
        this.importDiagram(xmlContent);
      };
      reader.readAsText(file);
    }
  }

  importDiagram(xmlContent: string): void {
    this.modeler.importXML(xmlContent, (err: any) => {
      if (err) {
        console.error('Error importing diagram:', err);
      } else {
        console.log('Diagram imported successfully.');
      }
    });
  }

  private zoomToFit() {
    const canvas: any = this.modeler.get('canvas'); // Explicitly type canvas as any
    canvas.zoom('fit-viewport');
  }
}
