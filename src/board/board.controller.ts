import { Body, Controller, Get, Param, Post, Delete, Patch, ValidationPipe, UsePipes, ParseIntPipe, UseGuards, ForbiddenException, Sse, Inject  } from '@nestjs/common';
import { Observable, interval } from 'rxjs';
import { map, retry } from 'rxjs/operators';
import { AuthGuard } from '@nestjs/passport';
import { BoardService } from './board.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { Board } from './board.entity';
import { GetUserType } from 'src/decorators/get-user.type.decorator';
import { GetUserId } from 'src/decorators/get-user.userid.decorator';
import { GetUserCode } from 'src/decorators/get-user.code.decorator';
import { responseBoardDto } from './dto/response-board.dto';
import { AuthService } from 'src/auth/auth.service';
import { GetUser } from 'src/decorators/get-user.decorator';
import { User } from 'src/auth/user.entity';
import { PushService } from 'src/push/push.service';
import { EventEmitter } from 'stream';
import { responseSseBoardDto } from './dto/response-board.dto';

let globalVersion = 0; // Global version variable

@Controller('board')
@UseGuards(AuthGuard())
export class BoardController {
    constructor(
        private boardService: BoardService,
        private AuthService: AuthService,
        private pushService: PushService,
        @Inject('UserMap')
        private userMap: Map<string, number>
        ) {
            this.userMap = new Map<string, number>();
        }
    @Post('grape/create')
    @UsePipes(ValidationPipe)
    async createBoard(
        @GetUserType() type: string,
        @GetUser() user: User,
        @GetUserId() id: number,
        @GetUserCode() code: string,
    ): Promise <responseBoardDto> {
       
        if (type !== 'PARENT') {
            throw new ForbiddenException('only parent can create board');
        }
        const grape = await this.boardService.getBoardByUserId(id);


        if (grape) {
            throw new ForbiddenException('parents already have grape');
        }
        
        const response: responseBoardDto = {
            code: 200,
            success: true,
            data: {
                grape: await this.boardService.createBoard(type, code, id)
            },
        };
        
        this.userMap.set(user.user_id, Date.now());
        // globalVersion += 1;

        return response

    }

    @Delete('/grape')
    async deleteBoard(
        @GetUserType() type: string,
        @GetUserId() userid: number,
        @GetUser() user: User
    ): Promise<{ code: number; success: boolean }> {
        if (type !== 'PARENT') {
            throw new ForbiddenException('Only parents can update a wishlist.');
        }

        const grape = await this.boardService.getBoardByUserId(userid);

        if (!grape) {
            throw new ForbiddenException('parents not have grape');
        }

        //User id를 통해서 board id를 가져온다.
        const board_id = await this.boardService.getBoardByUserId(userid);
        
        this.userMap.set(user.user_id, Date.now());
        // globalVersion += 1;

        return await this.boardService.deleteBoard(board_id.id);
    }

    @Get('/grape/:id')
    getBoardById(@Param('id', ParseIntPipe) id: number): Promise<Board> {
        return this.boardService.getBoardById(id);
    }

    @Sse('/grape/sse/user')
    async sseGetBoardByUserId(
      @GetUser() user: User,
      @GetUserId() id: number,
      @GetUserType() type: string,
    ): Promise<Observable<responseSseBoardDto>> {
      EventEmitter.defaultMaxListeners = 10;
      if (type !== 'PARENT') {
        id = await this.AuthService.getConnectedUser(user);
      }
      let currentUser = user.user_id
      // let now = Date.now()
      let currentUserUpdateTime = this.userMap.get(currentUser)
      console.log(currentUserUpdateTime, 'this is curuserupdatetime')

      const use_grape = await this.boardService.getBoardByUserId(id);
      return new Observable<responseSseBoardDto>((observer) => {
        let localVersion = 0; // Local version variable
        const initialData = async () => {
            this.userMap.set(currentUser, currentUserUpdateTime);
            if (!use_grape) {
                const initialResponse: responseSseBoardDto = {
                    data: {
                        code: 200,
                        success: true,
                        grape: {
                            id:0,
                            blank: 0,
                            total_grapes: 0,
                            attached_grapes: 0,
                            deattached_grapes: 0,
                        },
                        is_existence: false,
                    },
                };
                observer.next(initialResponse);
                localVersion = globalVersion; // Update the local version
                return;
            }
          // 맨 처음 보드 상태를 불러옴
            const initialResponse: responseSseBoardDto = {
                data: {
                code: 200,
                success: true,
                grape: await this.boardService.getBoardByUserId(id),
                is_existence: true,
                },
            };
            observer.next(initialResponse);
            localVersion = globalVersion; // Update the local version
            };
        console.log(currentUserUpdateTime, Date.now() - 100, '계산')
        console.log(this.userMap, 'usermap')
        const updateData = async () => {
            console.log(this.userMap.get(user.user_id), Date.now() - 100, '계산')
          if (Date.now() - this.userMap.get(user.user_id) <  100) {
            console.log('trigger 발동')
            const use_grape = await this.boardService.getBoardByUserId(id);
            if (!use_grape) {
                const response: responseSseBoardDto = {
                    data: {
                        code: 200,
                        success: true,
                        grape: {
                            id:0,
                            blank: 0,
                            total_grapes: 0,
                            attached_grapes: 0,
                            deattached_grapes: 0,
                        },
                        is_existence: false,
                    },
                };
                observer.next(response);
                return;
            }
            const response: responseSseBoardDto = {
              data: {
                code: 200,
                success: true,
                grape: await this.boardService.getBoardByUserId(id),
                is_existence: true,
              },
            };
            observer.next(response);
            this.userMap.set(user.user_id, Date.now());
          }
        };
        initialData(); // 맨 처음 보드 상태를 불러옴
        const intervalId = setInterval(updateData, 500);
        // Clean up the interval when the client disconnects
        observer.complete = () => {
          clearInterval(intervalId);
        };
        return observer;
      });
    }
    
    @Post('/grape/user')
    async getBoardByUserId(
        @GetUser() user: User,
        @GetUserId() id: number,
        @GetUserType() type: string): Promise<responseBoardDto> {
           

            if (type !== 'PARENT') {
                id = await this.AuthService.getConnectedUser(user);
            }

            const grape = await this.boardService.getBoardByUserId(id);
         
    
            if (!grape) {
                const response: responseBoardDto = {
                    code: 200,
                    success: true,
                    data: {
                        grape: {
                            id:0,
                            blank: 0,
                            total_grapes: 0,
                            attached_grapes: 0,
                            deattached_grapes: 0,
                        }
                    },
                    is_existence: false,
                };
                return response;
            }

            const response: responseBoardDto = {
                code: 200,
                success: true,
                data: {
                    grape: await this.boardService.getBoardByUserId(id)
                },
                is_existence: true,
            };
            return response;
        }

    // 처음에 지정한 수 변경
    @Post('/grape')
    async updateBoard(
        @Body() CreateBoardDto: CreateBoardDto,
        @GetUserType() type: string,
        @GetUserId() id: number,
        @GetUser() user: User,

    ): Promise<responseBoardDto> {
        if (type !== 'PARENT') {
            throw new ForbiddenException('only parent can update board');
        }
        const grape = await this.boardService.getBoardByUserId(id);
      

        if (!grape) {
            throw new ForbiddenException('parents not have grape');
        }
        
        const response: responseBoardDto = {
            code: 200,
            success: true,
            data: {
                grape: await this.boardService.updateBoard(grape.id, CreateBoardDto, id)
            },
        };

        this.userMap.set(user.user_id, Date.now());
        // globalVersion += 1;

        const title = '포도알이 발급되었어요! 지금 확인해보세요.';

        try {
            const connect_id = await this.AuthService.getConnectedUser(user);
    
            const pushToken = await this.pushService.getPushToeknByUserId(connect_id);
    
            await this.pushService.push_noti(pushToken, title);
            return response
        } catch (exception) {
            if (exception instanceof ForbiddenException) {
               return response;
            }
        }
    }

    //포도 부착 버튼 클릭시 실행 함수
    @Post('/grape/attach')
    async attachBoard(
        @GetUser() user: User,
        @GetUserType() type: string,
        @GetUserCode() code: string,
    ): Promise<responseBoardDto> {


        if (type !== 'CHILD') {
            throw new ForbiddenException('only child can attach board');
        }


        const id = await this.AuthService.getConnectedUser(user);
        
        const grape = await this.boardService.getBoardByUserId(id);
        

        if (!grape) {
            throw new ForbiddenException('parents not have grape');
        }
        
        
        const response: responseBoardDto = {
            code: 200,
            success: true,
            data: {
                grape: await this.boardService.attachBoard(grape.id, code)
            },
        };
        
        this.userMap.set(user.user_id, Date.now());
        // globalVersion += 1;
        return response
    }

}
