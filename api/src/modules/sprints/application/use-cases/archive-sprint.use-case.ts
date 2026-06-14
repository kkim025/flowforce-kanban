import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ISprintRepository } from '../../domain/sprint.repository.interface';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { Sprint } from '../../domain/sprint.entity';

@Injectable()
export class ArchiveSprintUseCase {
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

    // If already archived, return as-is (idempotent)
    if (sprint.props.status === 'ARCHIVED') {
      return sprint;
    }

    const prevStatus = sprint.props.status;

    const archivedResult = Sprint.create(
      {
        ...sprint.props,
        status: 'ARCHIVED',
      },
      sprint.id,
    );

    if (archivedResult.isFailure) {
      throw new Error(String(archivedResult.error));
    }

    const archivedSprint = archivedResult.getValue();
    await this.sprintRepository.save(archivedSprint);

    // v1: notify the board owner. TODO(acl): when boards gain multi-member
    // membership, fan out to all members from the listener instead of
    // resolving a single recipient here.
    const board = await this.prisma.board.findUnique({
      where: { id: archivedSprint.boardId },
      select: { ownerId: true },
    });

    // Append-only: emit a domain event for the notifications listener.
    this.eventEmitter.emit('sprint.status_changed', {
      sprintId,
      sprintName: archivedSprint.props.name,
      fromStatus: prevStatus,
      toStatus: 'ARCHIVED',
      actorId,
      boardId: archivedSprint.boardId,
      recipientId: board?.ownerId,
    });

    return archivedSprint;
  }
}
