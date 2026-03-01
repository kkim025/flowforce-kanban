import { Module, forwardRef } from "@nestjs/common";
import { BoardsService } from "./boards.service";
import { BoardsController } from "./boards.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { PrismaBoardRepository } from "./infrastructure/persistence/prisma-board.repository";
import { CreateBoardUseCase } from "./application/use-cases/create-board.use-case";
import { ColumnsModule } from "../columns/columns.module";

@Module({
  imports: [PrismaModule, forwardRef(() => ColumnsModule)],
  controllers: [BoardsController],
  providers: [
    BoardsService,
    {
      provide: "IBoardRepository",
      useClass: PrismaBoardRepository,
    },
    // Explicit injection for use case
    {
      provide: CreateBoardUseCase,
      useFactory: (repo: PrismaBoardRepository) => new CreateBoardUseCase(repo),
      inject: ["IBoardRepository"],
    },
  ],
  exports: [BoardsService, "IBoardRepository", CreateBoardUseCase],
})
export class BoardsModule {}
