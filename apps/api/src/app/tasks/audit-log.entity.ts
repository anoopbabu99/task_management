import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  action: string; // "CREATE", "UPDATE", "DELETE"

  @Column()
  taskId: string;

  @Column()
  userId: string; // Who 

  @Column()
  orgId: string; // Which Org 

  @Column({ nullable: true })
  details: string;

  @CreateDateColumn()
  timestamp: Date;
}