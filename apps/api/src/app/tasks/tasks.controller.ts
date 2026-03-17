import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  Param, 
  Patch,
  UseGuards, 
  Request 
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { AuthGuard } from '@nestjs/passport';
import { TaskStatus, UserRole } from '@ababu/data';
import { Roles, RolesGuard } from '@ababu/auth';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'), RolesGuard) // <--- This protects ALL routes below
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // 1. CREATE
  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @Request() req) {
    return this.tasksService.createTask(createTaskDto, req.user);
  }

  // 2. VIEW TASKS
  @Get()
  findAll(@Request() req) {
    return this.tasksService.getTasks(req.user);
  }

  // 3. AUDIT LOGS 
  @Get('audit-log')
  getAuditLogs(@Request() req) {
    return this.tasksService.getAuditLogs(req.user);
  }

  @Patch('reorder')
  reorder(@Body() body: { ids: string[] }, @Request() req) {
    return this.tasksService.reorderTasks(body.ids, req.user);
  }

  // 4. UPDATE TASK (Changed to PATCH to match Frontend)
  @Patch(':id') 
  update(
    @Param('id') id: string, 
    @Body() updateDto: { title?: string; description?: string; status?: TaskStatus; category?: string }, 
    @Request() req
  ) {
    return this.tasksService.updateTask(id, updateDto, req.user);
  }

  // 5. DELETE TASK
  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  remove(@Param('id') id: string, @Request() req) {
    return this.tasksService.deleteTask(id, req.user);
  }
}