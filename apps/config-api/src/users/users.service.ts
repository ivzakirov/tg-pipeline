import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  async create(email: string, password: string): Promise<UserEntity> {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.repo.create({ email, passwordHash });
    return this.repo.save(user);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async validatePassword(user: UserEntity, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }
}
