import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Test, TestDocument } from './schemas/test.schema';

@Injectable()
export class TestService {
  constructor(@InjectModel(Test.name) private testModel: Model<TestDocument>) {}

  async create(message: string) {
    const createdTest = new this.testModel({ message });
    return createdTest.save();
  }

  async findAll() {
    return this.testModel.find().exec();
  }

  async update(id: string, newMessage: string) {
    return this.testModel.findByIdAndUpdate(
      id,
      { message: newMessage },
      { new: true } // Devuelve el documento actualizado
    ).exec();
  }

  async remove(id: string) {
    return this.testModel.findByIdAndDelete(id).exec();
  }
}
