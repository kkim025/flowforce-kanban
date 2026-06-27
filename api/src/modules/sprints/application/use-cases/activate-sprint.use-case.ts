import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ISprintRepository } from '../../domain/sprint.repository.interface';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { Sprint } from '../../domain/sprint.entity';
import { SprintStatus } from '../../domain/sprint-status';

@Injectable()
export class ActivateSprintUseCase {
  constructor(
    @Inject('ISprintRepository')
    private sprintRepository: ISprintRepository,
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async execute(sprintId: string, actorId: string): Promise<Sprint> {
    const sprint = await this.sprintRepository.findById(sprintId);
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (sprint.isCompleted()) {
      throw new ConflictException('Cannot activate a completed sprint');
    }

    const prevStatus = sprint.props.status;

    await this.prisma.$transaction(async (tx) => {
      // Deactivate all other sprints on the same board
      await tx.sprint.updateMany({
        where: { boardId: sprint.boardId, status: SprintStatus.ACTIVE },
        data: { status: SprintStatus.COMPLETED },
      });
      // Activate this sprint
      await tx.sprint.update({
        where: { id: sprintId },
        data: { status: SprintStatus.ACTIVE },
      });
    });

    const updatedSprint = await this.sprintRepository.findById(sprintId);

    // v1: notify the board owner. TODO(acl): when boards gain multi-member
    // membership, fan out to all members from the listener instead of
    // resolving a single recipient here.
    const board = await this.prisma.board.findUnique({
      where: { id: sprint.boardId },
      select: { ownerId: true },
    });

    // Append-only: emit a domain event for the notifications listener.
    this.eventEmitter.emit('sprint.status_changed', {
      sprintId,
      sprintName: updatedSprint?.props.name ?? sprint.props.name,
      fromStatus: prevStatus,
      toStatus: SprintStatus.ACTIVE,
      actorId,
      boardId: sprint.boardId,
      recipientId: board?.ownerId,
    });

    return updatedSprint!;
  }
}
