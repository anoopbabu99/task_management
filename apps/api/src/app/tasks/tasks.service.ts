import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Task } from './task.entity';
import { AuditLog } from './audit-log.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/user.entity'; 
import { CreateTaskDto } from './dto/create-task.dto';
import { UserRole, TaskStatus } from '@ababu/data';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(Organization)
    private orgRepository: Repository<Organization>,
  ) {}

  //  SAVE LOG ---
  private async logAction(user: any, taskId: string, action: string, details: string) {
    const log = this.auditLogRepository.create({
      userId: user.username, 
      orgId: user.orgId,
      taskId,
      action,
      details,
    });
    return this.auditLogRepository.save(log);
  }

  async reorderTasks(ids: string[], user: any): Promise<void> {
    // We loop through the IDs provided in the array
    // The index in the array becomes the new 'order' in the DB
    for (let i = 0; i < ids.length; i++) {
      await this.tasksRepository.update(ids[i], { order: i });
    }
  }

  // --- 1. CREATE TASK ---
  

  async createTask(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    
    const { title, description, category } = createTaskDto;

    const task = this.tasksRepository.create({
      title,
      description,
      status: TaskStatus.OPEN,
      category: category || 'Work', 
      user, 
    });

    const savedTask = await this.tasksRepository.save(task);

    await this.logAction(user, savedTask.id, 'CREATE', `Created task: "${title}"`);

    return this.tasksRepository.findOne({
      where: { id: savedTask.id },
      relations: ['user', 'user.organization']
    });
  }

  // --- 2. GET TASKS ---
  async getTasks(user: any): Promise<Task[]> {
    let where: any = {}; 

    if (user.role === UserRole.VIEWER) {
      // 1. Viewers: Only see their OWN tasks
      where = { user: { id: user.id } };
    
    } else if (user.role === UserRole.ADMIN) {
      // 2. Admins: See tasks in their specific sub-org only
      where = { user: { organization: { id: user.orgId } } };
    
    } else if (user.role === UserRole.OWNER) {
      // 3. Owners: See tasks in their Org AND direct Child Orgs
      where = [
        { user: { organization: { id: user.orgId } } },       // Tasks in my HQ
        { user: { organization: { parent: { id: user.orgId } } } } // Tasks in my sub-depts
      ];
    }

    return this.tasksRepository.find({
      where, 
      relations: ['user', 'user.organization'], 
      
      order: { 
        order: 'ASC', // Sort by custom order first
        status: 'ASC', // Then by status 
        createdAt: 'DESC'

      }
    });
  }

  // --- 3. UPDATE TASK ---

  async updateTask(id: string, updates: { title?: string; description?: string; status?: TaskStatus; category?: string }, user: any): Promise<Task> {
    const task = await this.tasksRepository.findOne({ 
      where: { id }, 
      relations: ['user', 'user.organization', 'user.organization.parent'] 
    });

    if (!task) throw new NotFoundException('Task not found');

    // --- PERMISSION CHECK ---
    let canEdit = false;
    if (task.user.id === user.id) canEdit = true;
    else if (user.role !== UserRole.VIEWER) {
      const taskOrgId = task.user.organization?.id;
      const taskParentId = task.user.organization?.parent?.id;
      if ((taskOrgId === user.orgId) || (taskParentId === user.orgId)) {
        canEdit = true;
      }
    }
    if (!canEdit) throw new ForbiddenException('Access Denied');
    // ------------------------

    // --- CALCULATE "DIFF" FOR FORMAL LOGS ---
    const changes: string[] = [];

    if (updates.title && updates.title !== task.title) {
      changes.push(`Title changed from "${task.title}" to "${updates.title}"`);
      task.title = updates.title;
    }
    
    // 2. Category 
    if (updates.category && updates.category !== task.category) {
      const oldCat = task.category || 'General';
      changes.push(`Category changed from "${oldCat}" to "${updates.category}"`);
      task.category = updates.category;
    }

    // 3. Description 
    if (updates.description && updates.description !== task.description) {
      const oldDesc = task.description.length > 20 ? task.description.substring(0, 20) + '...' : task.description;
      const newDesc = updates.description.length > 20 ? updates.description.substring(0, 20) + '...' : updates.description;
      changes.push(`Description changed from "${oldDesc}" to "${newDesc}"`);
      task.description = updates.description;
    }

    // 4. Status
    if (updates.status && updates.status !== task.status) {
      changes.push(`Status changed from ${task.status} to ${updates.status}`);
      task.status = updates.status;
    }

    // Only save if there were actual changes
    if (changes.length > 0) {
      const updated = await this.tasksRepository.save(task);
      
      // Log the specific changes
      await this.logAction(user, task.id, 'UPDATE', changes.join('; '));
      
      return updated;
    }

    return task; // Return original if nothing changed
  }

  // --- 4. DELETE TASK ---
  async deleteTask(id: string, user: any): Promise<void> {
    const task = await this.tasksRepository.findOne({ 
      where: { id }, 
      
      relations: ['user', 'user.organization', 'user.organization.parent'] 
    });

    if (!task) throw new NotFoundException('Task not found');

    let canDelete = false;
    if (task.user.id === user.id) canDelete = true;
    else if (user.role !== UserRole.VIEWER) {
      const taskOrgId = task.user.organization?.id;
      const taskParentId = task.user.organization?.parent?.id;
      
      if ((taskOrgId === user.orgId) || (taskParentId === user.orgId)) {
        canDelete = true;
      }
    }

    if (!canDelete) throw new ForbiddenException('Access Denied');

    // LOG BEFORE DELETE
    await this.logAction(user, id, 'DELETE', `Deleted task: ${task.title}`);
    await this.tasksRepository.delete(id);
  }

  // --- 5. GET AUDIT LOGS ---
  async getAuditLogs(user: any): Promise<AuditLog[]> {
    const { role, orgId } = user;

    if (role === UserRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot access audit logs');
    }

    // OWNER: See Root + Child Orgs
    if (role === UserRole.OWNER) {
      const myOrg = await this.orgRepository.findOne({
        where: { id: orgId },
        relations: ['children']
      });

      // Collect all IDs (Mine + My Children)
      const allowedOrgIds = [myOrg.id];
      if (myOrg.children) {
        allowedOrgIds.push(...myOrg.children.map(c => c.id));
      }

      return this.auditLogRepository.find({
        where: { orgId: In(allowedOrgIds) },
        order: { timestamp: 'DESC' }
      });
    }

    // ADMIN: See My Org Only
    return this.auditLogRepository.find({
      where: { orgId },
      order: { timestamp: 'DESC' },
    });
  }
}