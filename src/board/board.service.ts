import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BoardRepository } from './board.repository';
import { BoardDto } from './dto/response-board.dto';
import { Board } from './board.entity';


@Injectable()
export class BoardService {
    constructor(
        @InjectRepository(BoardRepository)
        private boardRepository: BoardRepository,
    ) { }

    async getBoardById(id: number): Promise<Board> {
        return this.boardRepository
            .createQueryBuilder('board')
            .leftJoinAndSelect('board.user', 'user')
            .select(['board.id', 'board.blank', 'board.total_grapes', 'board.attached_grapes', 'board.deattached_grapes', 'user.id', 'user.code'])
            .where('board.id = :id', { id })
            .getOne();
    }

    createBoard(createBoardDto, type:string, code:string, id:number): Promise<BoardDto> {
        return this.boardRepository.createBoard(createBoardDto, type, code, id);
    }

    async deleteBoard(id: number): Promise<{ code: number; success: boolean }> {
        const result = await this.boardRepository.delete(id);

        if (result.affected === 0) {
            throw new NotFoundException(`Can't find board with id ${id}`);
          }

        console.log(`Board with ID "${id}" deleted`);

        return {
            code: 200,
            success: true,
        };
    }

    async getBoardByUserId(user_id: number): Promise<Board[]> {
        const query = this.boardRepository.createQueryBuilder('board');
        query.where('board.userId = :userId', {userId: user_id});

        if (!query) {
            throw new NotFoundException(`Board with user ID "${user_id}" not found`);
        }
        const boards = await query.getMany();
        
        return boards;
    }

    async updateBoard(grapeid: number, createBoardDto, id:number): Promise<BoardDto> {
        const board = await this.getBoardById(grapeid);
        console.log(board);

        if (id !== board.user.id) {
            throw new ForbiddenException('You can only update your own board.');
        }

        board.blank = createBoardDto.blank;
        board.total_grapes = createBoardDto.total_grapes;
        board.attached_grapes = createBoardDto.attached_grapes;
        board.deattached_grapes = createBoardDto.deattached_grapes;

        await this.boardRepository.save(board);

        const { id : boardId, blank, total_grapes, attached_grapes, deattached_grapes } = board;

        const grape: BoardDto = {
            id: boardId,
            blank,   
            total_grapes,
            attached_grapes,
            deattached_grapes,
        };

        return grape;

    }

    async attachBoard(grapeid: number, code:string): Promise<BoardDto> {
        const board = await this.getBoardById(grapeid);
        console.log(board);

        if (code !== board.user.code) {
            throw new ForbiddenException("You can only update your parent's board.");
        }

        board.attached_grapes = board.attached_grapes + 1;
        board.deattached_grapes = board.deattached_grapes - 1;

        await this.boardRepository.save(board);

        const { id : boardId, blank, total_grapes, attached_grapes, deattached_grapes } = board;

        const grape: BoardDto = {
            id: boardId,
            blank,   
            total_grapes,
            attached_grapes,
            deattached_grapes,
        };

        return grape;

    }

    

}
