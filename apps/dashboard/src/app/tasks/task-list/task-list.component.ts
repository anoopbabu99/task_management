import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService, Task } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { TaskStatus } from '@ababu/data';
import { 
  CdkDragDrop, 
  moveItemInArray, 
  transferArrayItem, 
  DragDropModule 
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './task-list.component.html' 
})
export class TaskListComponent implements OnInit {
  // MASTER LIST
  allTasks: Task[] = [];

  // FILTER STATES
  selectedOrg = '';
  selectedUser = '';
  selectedCategory = '';
  sortBy = 'newest'; // Default sort
  isDeleteModalOpen = false;
  isAccessDeniedModalOpen = false;
  taskToDeleteId: string | null = null;

  // DROPDOWN OPTIONS 
  uniqueOrgs: string[] = [];
  uniqueUsers: string[] = [];
  
  // DRAG & DROP ARRAYS 
  todoTasks: Task[] = [];
  inProgressTasks: Task[] = [];
  doneTasks: Task[] = [];

  currentUsername = '';
  userRole = '';
  companyName = '';
  departmentName: string | null = null;
  
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  
  // Modal State
  isModalOpen = false;
  isEditMode = false;
  selectedTaskId: string | null = null;
  newTask = { title: '', description: '', category: 'Work' }; // Default to 'Work'
  
  // Audit State
  isAuditModalOpen = false;
  auditLogs: any[] = [];

  ngOnInit() {
    this.currentUsername = this.authService.getUsername();
    this.userRole = this.authService.getUserRole();
    
    const token = localStorage.getItem('access_token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // ✨ THIS WILL PROVE WHAT THE BACKEND SENT ✨
      console.log('Decoded JWT Payload:', payload);

      this.companyName = payload.companyName || 'My Workspace';
      this.departmentName = payload.departmentName || null; 
    }

    this.loadTasks();
  }

  aiSummary = '';
  isAiLoading = false;

  closeAuditModal() {
    this.isAuditModalOpen = false;
    this.auditLogs = [];
    this.aiSummary = '';
  }

  generateAiSummary() {
    this.isAiLoading = true;
    this.aiSummary = '';
    
    const recentLogs = this.auditLogs.slice(0, 20).map(log => 
      `[${new Date(log.timestamp).toLocaleString()}] User: ${log.userId}, Action: ${log.action}, Task: ${log.taskId?.substring(0, 5)}, Details: ${log.details}`
    ).join('\n');

    const prompt = `Analyze these recent task audit logs and provide a brief 2-3 sentence insight on team productivity or bottlenecks:\n${recentLogs}`;

    this.taskService.askClaude(prompt).subscribe({
      next: (summary: string) => {
        this.aiSummary = summary;
        this.isAiLoading = false;
      },
      error: (err: any) => {
        console.error(err);
        this.aiSummary = 'Failed to load insights.';
        this.isAiLoading = false;
      }
    });
  }

  loadTasks() {
    this.taskService.getTasks().subscribe({
      next: (data) => {
        this.allTasks = data;
        
       
        this.uniqueOrgs = [...new Set(data.map(t => t.user?.organization?.name).filter(Boolean))] as string[];
        this.uniqueUsers = [...new Set(data.map(t => t.user?.username).filter(Boolean))] as string[];
        
        
        this.applyFilters(); 
        
      },
      error: (err) => console.error('Failed to load tasks', err)
    });
  }

  applyFilters() {
    let filtered = [...this.allTasks];

    // 1. Filter by Organization (Owner Only)
    if (this.selectedOrg) {
      filtered = filtered.filter(t => t.user?.organization?.name === this.selectedOrg);
    }

    // 2. Filter by User (Owner & Admin)
    if (this.selectedUser) {
      filtered = filtered.filter(t => t.user?.username === this.selectedUser);
    }

    // 3. Filter by Category (Everyone)
    if (this.selectedCategory) {
      filtered = filtered.filter(t => t.category === this.selectedCategory);
    }

    // 4. Sort (Newest vs Oldest)
    if (this.sortBy === 'newest') {
      //already done
    }

    // 5. Update the Columns
    this.todoTasks = filtered.filter(t => t.status === 'OPEN');
    this.inProgressTasks = filtered.filter(t => t.status === 'IN_PROGRESS');
    this.doneTasks = filtered.filter(t => t.status === 'DONE');
  }

  // Helper to reset filters
  clearFilters() {
    this.selectedOrg = '';
    this.selectedUser = '';
    this.selectedCategory = '';
    this.applyFilters();
  }

  // Helper to split the tasks into columns
  distributeTasks() {
    this.todoTasks = this.allTasks.filter(t => t.status === 'OPEN');
    this.inProgressTasks = this.allTasks.filter(t => t.status === 'IN_PROGRESS');
    this.doneTasks = this.allTasks.filter(t => t.status === 'DONE');
  }

  // --- DRAG AND DROP LOGIC 
  drop(event: CdkDragDrop<Task[]>) {
    // CASE 1: Same Column (No Status Change) -> Just Reorder
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.saveOrder(event.container.data);
    } 
    // CASE 2: Different Column (Status Change + Reorder)
    else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );

      const task = event.container.data[event.currentIndex];
      let newStatus = '';

      if (event.container.data === this.todoTasks) newStatus = 'OPEN';
      else if (event.container.data === this.inProgressTasks) newStatus = 'IN_PROGRESS';
      else if (event.container.data === this.doneTasks) newStatus = 'DONE';

      if (newStatus) {
        // Optimistic Update 
        task.status = newStatus as any;
        
        // 1. CALL UPDATE STATUS
        this.taskService.updateTask(task.id, { status: newStatus }).subscribe({
          next: () => {
            // 2. WAIT FOR SUCCESS, THEN CALL REORDER
            
            this.saveOrder(event.container.data);
          },
          error: (err) => {
            console.error('Failed to update status', err);
            this.loadTasks(); 
          }
        });
      }
    }
  }

  
  saveOrder(tasks: Task[]) {
    const newOrderIds = tasks.map(t => t.id);
    this.taskService.reorderTasks(newOrderIds).subscribe({
      error: (err) => console.error('Failed to reorder', err)
    });
  }

  // --- MODALS ---
  openAuditModal() {
    this.isAuditModalOpen = true;
    this.taskService.getAuditLogs().subscribe({
      next: (logs) => this.auditLogs = logs,
      error: (err) => console.error('Failed to load audit logs', err)
    });
  }

  

  openModal() {
    this.isModalOpen = true;
    this.isEditMode = false;
    this.selectedTaskId = null;
    this.newTask = { title: '', description: '', category: 'Work' }; 
  }

  openEditModal(task: Task) {
    this.isModalOpen = true;
    this.isEditMode = true;
    this.selectedTaskId = task.id;
    // Use existing category, or fallback to 'Work' if missing
    this.newTask = { 
      title: task.title, 
      description: task.description, 
      category: task.category || 'Work' 
    };
  }

  closeModal() {
    this.isModalOpen = false;
    this.newTask = { title: '', description: '', category: 'Work' }; 
  }

  // --- CRUD ---
  initiateDelete(task: Task) {
    // Check Permissions immediately
    if (this.userRole === 'VIEWER') {
      this.isAccessDeniedModalOpen = true; // Show "You can't do this"
      return;
    }

    // If Admin/Owner, show "Are you sure?"
    this.taskToDeleteId = task.id;
    this.isDeleteModalOpen = true;
  }

  // 2. User clicks "Confirm" in the modal
  confirmDelete() {
    if (this.taskToDeleteId) {
      this.taskService.deleteTask(this.taskToDeleteId).subscribe({
        next: () => {
          this.loadTasks(); // Refresh list
          this.closeDeleteModal();
        },
        error: (err) => {
          console.error('Delete failed', err);
          alert('Failed to delete task'); // Fallback error
          this.closeDeleteModal();
        }
      });
    }
  }

  // 3. User clicks Cancel/Close
  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.isAccessDeniedModalOpen = false;
    this.taskToDeleteId = null;
  }

  submitTask() {
    if (!this.newTask.title || !this.newTask.description) return;

    if (this.isEditMode && this.selectedTaskId) {
      this.taskService.updateTask(this.selectedTaskId, this.newTask).subscribe({
        next: () => {
          this.loadTasks(); // Refresh columns
          this.closeModal();
        },
        error: (err) => console.error('Failed to update task', err)
      });
    } else {
      this.taskService.createTask(this.newTask).subscribe({
        next: () => {
          this.loadTasks(); // Refresh columns
          this.closeModal();
        },
        error: (err) => console.error('Failed to create task', err)
      });
    }
  }

  logout() {
    this.authService.logout();
  }

  private calculateMyDepartment() {
    const myTask = this.allTasks.find(t => t.user?.username === this.currentUsername);
    if (myTask && myTask.user?.organization) {
      this.companyName = myTask.user.organization.name;
    }
  }
}