import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { Task } from '../tasks/task.entity';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// 1. Mock the entire library globally
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockOrgRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const mockTaskRepository = {}; 
  const mockJwtService = {
    sign: jest.fn(() => 'mock_access_token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(Organization), useValue: mockOrgRepository },
        { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    
    // Clear mocks to ensure clean slate for every test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- TEST 1: LOGIN SUCCESS ---
  it('login should return an access_token for valid credentials', async () => {
    const mockUser = { 
      id: 'u1', 
      username: 'test', 
      password: 'hashed_password', 
      role: 'ADMIN',
      organization: { id: 'o1' }
    };

    mockUserRepository.findOne.mockResolvedValue(mockUser);
    
    
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login('test', 'password');

    expect(result).toEqual({ 
      access_token: 'mock_access_token', 
    });
    expect(mockJwtService.sign).toHaveBeenCalled();
  });

  // --- TEST 2: LOGIN FAILURE ---
  it('login should throw UnauthorizedException for wrong password', async () => {
    const mockUser = { id: 'u1', username: 'test', password: 'hashed_password' };
    mockUserRepository.findOne.mockResolvedValue(mockUser);
    
    
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login('test', 'wrong_pass')).rejects.toThrow(UnauthorizedException);
  });
});