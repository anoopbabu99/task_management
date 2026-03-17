import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn } from 'typeorm';
import { Task } from '../tasks/task.entity';
import { Organization } from '../organizations/entities/organization.entity'; // <--- Import this
import { UserRole } from '@ababu/data';


@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ type: 'simple-enum', enum: UserRole, default: UserRole.VIEWER })
  role: UserRole;

  
  @ManyToOne(() => Organization, (org) => org.users, { nullable: true })
  organization: Organization;
  

  @OneToMany(() => Task, (task) => task.user)
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;
}