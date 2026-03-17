import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UserRole, TaskStatus } from '@ababu/data';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;

  // Mock the Service 
  const mockTasksService = {
    createTask: jest.fn((dto, user) => {
      return {
        id: 'mock-id',
        ...dto,
        status: TaskStatus.OPEN,
        user,
      };
    }),
    getTasks: jest.fn(() => []),
    deleteTask: jest.fn(() => ({ deleted: true })),
  };

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    role: UserRole.ADMIN,
    organization: { id: 'org-1' },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // --- TEST 1: GET /tasks ---
  it('GET /tasks should return an array of tasks', async () => {
    const req = { user: mockUser };
    const result = await controller.findAll(req);
    
    expect(result).toEqual([]);
    expect(service.getTasks).toHaveBeenCalledWith(mockUser);
  });

  // --- TEST 2: POST /tasks ---
  it('POST /tasks should create a task', async () => {
    const dto: CreateTaskDto = {
      title: 'New Task',
      description: 'Test Desc',
      category: 'Work'
    };
    const req = { user: mockUser };

    const result = await controller.create(dto, req);

    expect(result).toEqual({
      id: 'mock-id',
      title: 'New Task',
      description: 'Test Desc',
      category: 'Work',
      status: TaskStatus.OPEN,
      user: mockUser,
    });
    
    expect(service.createTask).toHaveBeenCalledWith(dto, mockUser);
  });

  // --- TEST 3: DELETE /tasks/:id ---
  it('DELETE /tasks/:id should call delete service', async () => {
    const req = { user: mockUser };
    await controller.remove('task-id', req);
    
    expect(service.deleteTask).toHaveBeenCalledWith('task-id', mockUser);
  });
});