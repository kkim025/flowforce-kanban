import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { IBoardRepository } from '../../../boards/domain/boards.repository.interface';
import { AddColumnDto } from '../../../boards/application/dto/add-column.dto';
import { Column } from '../../../boards/domain/column.entity';

@Injectable()
export class AddColumnUseCase {
  constructor(
    @Inject('IBoardRepository')
    private boardRepository: IBoardRepository,
  ) {}

  async execute(userId: string, dto: AddColumnDto): Promise<Column> {
    const board = await this.boardRepository.findById(dto.boardId);
    if (!board) {
      throw new NotFoundException(`Board with ID ${dto.boardId} not found`);
    }

    if (board.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const columnResult = Column.create({
      title: dto.title,
      order: dto.order,
    });

    if (columnResult.isFailure) {
      throw new Error(String(columnResult.error));
    }

    const column = columnResult.getValue();
    await this.boardRepository.saveColumn(board.id, column);

    return column;
  }
}
