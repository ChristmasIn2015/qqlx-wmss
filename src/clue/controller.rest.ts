import { Controller, Get, Post, Body, Patch, Delete, SetMetadata, UseGuards } from "@nestjs/common";

import { trimObject } from "qqlx-cdk";
import { ENUM_PROJECT, Clue, PATH_WMSS_CLUE, getClueDto, getClueRes, postClueDto, postClueRes } from "qqlx-core";
import { BrandDTO } from "qqlx-sdk";

import { BrandGuard, ENUM_BRAND_ROLE_ALL, ENUM_BRAND_ROLE_CORE } from "global/brand.guard";
import { ClueDao } from "dao/clue";
import { ClueService } from "src/clue/service";

@Controller(PATH_WMSS_CLUE)
@UseGuards(BrandGuard)
export class ClueController {
    constructor(
        //
        private readonly ClueService: ClueService,
        private readonly ClueDao: ClueDao
    ) {}

    @Post()
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async postClue(@Body("dto") dto: postClueDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<postClueRes> {
        await this.ClueService.insertOrderPrint(BrandDTO, dto.order);

        return null;
    }

    @Post("/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getClue(@Body("dto") dto: getClueDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getClueRes> {
        const page = await this.ClueDao.page(
            {
                corpId: BrandDTO.corp._id,
                scope: dto.search.scope,
                ...(dto.search.content && { content: new RegExp(dto.search.content) }),
            },
            dto.page
        );
        return page;
    }
}
