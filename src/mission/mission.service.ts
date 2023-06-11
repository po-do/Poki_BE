import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateMissionDto } from './dto/create-mission.dto';
import { Mission } from './mission.entity';
import { MissionRepository } from './mission.repository';

@Injectable()
export class MissionService {
    constructor(
        @InjectRepository(MissionRepository)
        private missionRepository: MissionRepository
    ) {}

    createMission(createMissionDto: CreateMissionDto): Promise <Mission> {
        return this.missionRepository.createMission(createMissionDto);
    }

    async getMissionByMissionId(mission_id: number): Promise <Mission> {
        const mission = await this.missionRepository.findOneBy({id: mission_id});

        if (!mission) {
            throw new NotFoundException(`Can't find Mission with id ${mission_id}`);
        }
        return mission;
    }
}