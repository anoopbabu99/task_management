import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/user.entity';

@Entity()
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  // --- HIERARCHY ---
  
  
  @ManyToOne(() => Organization, (org) => org.children, { nullable: true, onDelete: 'CASCADE' })
  parent: Organization; 

  // The Sub-Organizations
  @OneToMany(() => Organization, (org) => org.parent)
  children: Organization[]; 
  
 

  @OneToMany(() => User, (user) => user.organization)
  users: User[];
}