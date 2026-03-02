import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateAuthDto } from './dto/create-auth.dto'; 
import { Task } from '../tasks/task.entity';
import { TaskStatus } from '@ababu/data';
import { UserRole } from '@ababu/data';

import { IAuthResponse, ILoginPayload, IRegisterPayload } from '@ababu/data';


@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Organization)
    private orgRepository: Repository<Organization>, 
    @InjectRepository(Task)  
    private tasksRepository: Repository<Task>,
    private jwtService: JwtService
  ) {}

  async register(createAuthDto: CreateAuthDto) {
    const { username, password, role, organizationName, organizationId, parentId } = createAuthDto;
    let organization = null;

    // --- CASE A: CREATE NEW ORGANIZATION ---
    if (organizationName) {
      // 1. Creating a Sub-Organization (Level 2)
      if (parentId) {
        const parentOrg = await this.orgRepository.findOne({ where: { id: parentId } });
        if (!parentOrg) throw new BadRequestException('Parent Organization not found');
        
        organization = this.orgRepository.create({ 
          name: organizationName, 
          parent: parentOrg // Link to Parent
        });
      } 
      // 2. Creating a Root Organization (Level 1)
      else {
        if (role !== UserRole.OWNER) {
           throw new BadRequestException('Only Owners can create a Root Organization');
        }
        organization = this.orgRepository.create({ name: organizationName });
      }
      await this.orgRepository.save(organization);
    } 
    
    // --- CASE B: JOIN EXISTING ORGANIZATION ---
    else if (organizationId) {
      organization = await this.orgRepository.findOne({ where: { id: organizationId } });
      if (!organization) throw new BadRequestException('Organization not found');
    } 
    
    
    else {
      throw new BadRequestException('Must provide organizationName (to create) or organizationId (to join)');
    }

    // Create User
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      username,
      password: hashedPassword,
      role,
      organization,
    });

    return this.usersRepository.save(user);
  }

  

  async seed() {
    // 1. CLEANUP 
    // Delete in order: Tasks -> Users -> Orgs (to avoid Foreign Key errors)
    await this.tasksRepository.createQueryBuilder().delete().execute();
    await this.usersRepository.createQueryBuilder().delete().execute();
    await this.orgRepository.createQueryBuilder().delete().execute();

    // 2. CREATE HIERARCHY
    // Level 1: SpaceX (Root)
    const spaceX = this.orgRepository.create({ name: 'SpaceX' });
    await this.orgRepository.save(spaceX);

    // Level 2: Engineering (Child of SpaceX)
    const engineering = this.orgRepository.create({ 
      name: 'SpaceX Engineering', 
      parent: spaceX 
    });
    await this.orgRepository.save(engineering);

    // 3. CREATE USERS
    const password = await bcrypt.hash('password123', 10);

    // ELON (Owner - Sees All)
    const elon = this.usersRepository.create({
      username: 'elon', password, role: UserRole.OWNER, organization: spaceX
    });

    // GWYNNE (Admin - Sees Engineering)
    const gwynne = this.usersRepository.create({
      username: 'gwynne', password, role: UserRole.ADMIN, organization: engineering
    });

    // TOM (Viewer - Sees Self)
    const tom = this.usersRepository.create({
      username: 'tom', password, role: UserRole.VIEWER, organization: engineering
    });

    await this.usersRepository.save([elon, gwynne, tom]);

    // 4. CREATE TASKS (To Prove Scoping)
    // Elon's Task
    await this.tasksRepository.save(
      this.tasksRepository.create({ 
        title: 'Elon Task (Mars)', 
        description: 'Plan the mission to Mars', // <--- Added this
        user: elon, 
        status: TaskStatus.OPEN 
      })
    );

    // Gwynne's Task
    await this.tasksRepository.save(
      this.tasksRepository.create({ 
        title: 'Gwynne Task (Budget)', 
        description: 'Approve Q1 Engineering Budget', // <--- Added this
        user: gwynne, 
        status: TaskStatus.OPEN 
      })
    );

    // Tom's Task
    await this.tasksRepository.save(
      this.tasksRepository.create({ 
        title: 'Tom Task (Bugfix)', 
        description: 'Fix the login bug', // <--- Added this
        user: tom, 
        status: TaskStatus.OPEN 
      })
    );

    return { message: 'Database Seeded!' };
  }

  async login(username: string, pass: string) {
    const user = await this.usersRepository.findOne({ 
      where: { username },
      relations: ['organization'] 
    });

    if (!user) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) throw new UnauthorizedException('Wrong password');

    // Add Org ID to the token payload
    const payload = { 
      sub: user.id, 
      username: user.username, 
      role: user.role,
      orgId: user.organization ? user.organization.id : null 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}