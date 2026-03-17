import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

import { TaskStatus } from '@ababu/data';

@Entity()
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({ type: 'simple-enum', enum: TaskStatus, default: TaskStatus.OPEN })
  status: TaskStatus;

  
  @Column({ default: 'General' }) // Default category
  category: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @CreateDateColumn() // Auto-timestamps
  createdAt: Date;
  

  @ManyToOne(() => User, (user) => user.tasks, { eager: false })
  user: User;
}