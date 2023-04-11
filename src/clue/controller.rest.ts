import { Controller, Get, Post, Body, Patch, Delete, SetMetadata, UseGuards } from "@nestjs/common";

import { trimObject } from "qqlx-cdk";
import { ENUM_BRAND_ROLE, Clue, PATH_WMSS_CLUE, getClueDto, getClueRes } from "qqlx-core";
import { BrandDTO } from "qqlx-sdk";

import { BrandGuard, ENUM_BRAND_ROLE_ALL, ENUM_BRAND_ROLE_CORE } from "global/brand.guard";
import { ClueDao } from "dao/clue";

@Controller(PATH_WMSS_CLUE)
@UseGuards(BrandGuard)
export class ClueController {
    constructor(
        //
        private readonly ClueDao: ClueDao
    ) {}

    @Post("/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getClue(@Body("dto") dto: getClueDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getClueRes> {
        const page = await this.ClueDao.page(
            {
                corpId: BrandDTO.corp._id,
                scope: dto.search.scope,
                content: new RegExp(dto.search.content),
            },
            dto.page
        );
        return page;
    }
}
