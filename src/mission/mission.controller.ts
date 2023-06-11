import { Body, Controller, Get, Param, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { MissionService } from './mission.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { Mission } from './mission.entity';

@Controller('mission')
export class MissionController {
    constructor(private missionService: MissionService){}

    @Post('/create')
    @UsePipes(ValidationPipe)
    createMission(@Body() createMissionDto: CreateMissionDto,
    /* @GetUser() user: User */): Promise<Mission> {
        return this.missionService.createMission(createMissionDto, /*user*/);
    }

    @Get('/detail/:mission_id')
    getMissionByMissionId(@Param('mission_id') mission_id: number): Promise <Mission>{
        return this.missionService.getMissionByMissionId(mission_id);
    }
}