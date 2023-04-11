import { Controller, Get, Post, Body, Patch, Delete, SetMetadata, UseGuards } from "@nestjs/common";

import { PageRes, trimObject } from "qqlx-cdk";
import {
    PATH_CABINET_UNIT,
    postCabinetUnitDto,
    postCabinetUnitRes,
    getCabinetUnitDto,
    getCabinetUnitRes,
    patchCabinetUnitDto,
    patchCabinetUnitRes,
    deleteCabinetUnitDto,
    deleteCabinetUnitRes,
    CabinetUnit,
    CabinetUnitJoined,
} from "qqlx-core";
import { BrandDTO } from "qqlx-sdk";

import { BrandGuard, ENUM_BRAND_ROLE_ALL, ENUM_BRAND_ROLE_CORE } from "global/brand.guard";
import { CabinetUnitDao } from "dao/cabinet";
import { CabinetUnitService } from "src/cabinetUnit/service";

@Controller(PATH_CABINET_UNIT)
@UseGuards(BrandGuard)
export class CabinetUnitController {
    constructor(
        private readonly cabinetUnitService: CabinetUnitService,
        //
        private readonly CabinetUnitDao: CabinetUnitDao
    ) {}

    @Post()
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_CORE)
    async postCabinetUnit(@Body("dto") dto: postCabinetUnitDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<postCabinetUnitRes> {
        const exists = await this.cabinetUnitService.createCabinetUnit(dto.cabinet, dto.excels, BrandDTO.corp._id);
        for (let unit of exists) await this.cabinetUnitService.resetCabinetUnit(BrandDTO.corp._id, unit.name, unit.norm);
        return null;
    }

    @Post("/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getCabinetUnit(@Body("dto") dto: getCabinetUnitDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getCabinetUnitRes> {
        trimObject(dto.search);

        // 搜索
        const match = {
            cabinetId: dto.search.cabinetId,
            ...(dto.search?.name && { name: new RegExp(dto.search.name) }),
            ...(dto.search?.norm && { norm: new RegExp(dto.search.norm.replace(/\*/g, "\\*").replace(/\./g, "\\.")) }),
        };

        // 排序
        const option = {
            sortKey: dto.sortKey,
            sortValue: dto.sortValue,
        };

        dto.page.startTime = 0;
        const page: PageRes<CabinetUnit> = await this.CabinetUnitDao.page(match, dto.page, option);
        const list: CabinetUnitJoined[] = await this.CabinetUnitDao.aggregate([
            { $match: { _id: { $in: page.list.map((e) => e._id) } } },
            { $sort: { [dto.sortKey]: dto.sortValue } },
            { $lookup: { from: "cabinets", localField: "cabinetId", foreignField: "_id", as: "joinCabinet" } },
        ]);
        list.forEach((e) => {
            e.joinCabinet && (e.joinCabinet = e.joinCabinet[0]);
            e.poundsFinal /= 1000;
        });

        page.list = list;
        return page as PageRes<CabinetUnitJoined>;
    }

    @Patch()
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_CORE)
    async patchCabinetUnit(@Body("dto") dto: patchCabinetUnitDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<patchCabinetUnitRes> {
        for (let entity of dto.excels) {
            await this.CabinetUnitDao.updateOne(entity._id, { price: entity.price });
        }

        return null;
    }

    @Post("/delete")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_CORE)
    async deleteCabinetUnit(@Body("dto") dto: deleteCabinetUnitDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<deleteCabinetUnitRes> {
        await this.CabinetUnitDao.delete(dto.cabinetUnitId);
        return null;
    }
}
