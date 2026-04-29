import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  async create(userData: Partial<User>) {
    const createdUser = new this.userModel(userData);
    return createdUser.save();
  }

  async login(email: string, password: string) {
    const user = await this.userModel.findOne({ email, password }).exec();
    if (!user) {
      throw new HttpException('Correo o contraseña incorrectos', HttpStatus.UNAUTHORIZED);
    }
    return user;
  }

  async findAll() {
    return this.userModel.find().exec();
  }

  async findByPin(pin: string) {
    return this.userModel.findOne({ pin_vinculacion: pin }).exec();
  }

  async findUserById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }
}
