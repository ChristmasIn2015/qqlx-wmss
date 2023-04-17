import { Controller, Get, Post, Body, Patch, Delete, SetMetadata, UseGuards } from "@nestjs/common";

import { trimObject } from "qqlx-cdk";
import {
    ENUM_BRAND_ROLE,
    PATH_CABINET,
    ENUM_LAYOUT_CABINET,
    ENUM_POUNDS_FORMULA,
    postCabinetDto,
    postCabinetRes,
    getCabinetDto,
    getCabinetRes,
    patchCabinetDto,
    patchCabinetRes,
    deleteCabinetDto,
    deleteCabinetRes,
    RECOMAND_POUNDS_FORMULA,
    Cabinet,
    CabinetUnit,
} from "qqlx-core";
import { BrandDTO } from "qqlx-sdk";

import { BrandGuard, ENUM_BRAND_ROLE_ALL, ENUM_BRAND_ROLE_CORE } from "global/brand.guard";
import { CabinetDao, CabinetUnitDao } from "dao/cabinet";
import { CabinetUnitService } from "src/cabinetUnit/service";

@Controller(PATH_CABINET)
@UseGuards(BrandGuard)
export class CabinetController {
    constructor(
        private readonly cabinetUnitService: CabinetUnitService,
        //
        private readonly CabinetDao: CabinetDao,
        private readonly CabinetUnitDao: CabinetUnitDao
    ) {
        // this.init();
    }

    async init() {
        console.log("cabinet initing");
        const all: Cabinet[] = await this.CabinetDao.query({ layout: ENUM_LAYOUT_CABINET.INDIVIDUAL });
        let count = 0;
        for (const cabinet of all) {
            console.log(++count, all.length);
            const units: CabinetUnit[] = await this.CabinetUnitDao.query({ cabinetId: cabinet._id });
            let _count = 0;
            for (const unit of units) {
                console.log(++_count, units.length);
                await this.cabinetUnitService.resetCabinetUnit(unit.corpId, unit.name, unit.norm);
            }
        }
        console.log("cabinet init end");
    }

    @Post()
    @SetMetadata("BrandRole", [ENUM_BRAND_ROLE.ROOT, ENUM_BRAND_ROLE.PURCHASE, ENUM_BRAND_ROLE.SALES, ENUM_BRAND_ROLE.WM])
    async postCabinet(@Body("dto") dto: postCabinetDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<postCabinetRes> {
        if (!dto.name) throw new Error("请输入货架名称");
        // if (!dto.unit) throw new Error("请输入货架单位");
        trimObject(dto);

        const count = await this.CabinetDao.count({ corpId: BrandDTO.corp._id, name: dto.name });
        if (count > 0) throw new Error(`您已创建了 @${dto.name}`);

        const schema = this.CabinetDao.getSchema();
        schema.corpId = BrandDTO.corp._id;
        schema.name = dto.name;
        schema.unit = dto.unit;
        schema.formula = dto.formula;
        schema.layout = dto.layout;

        const cabinet = await this.CabinetDao.create(schema, { isNoEmptyString: true });

        // 添加推荐商品
        await this.cabinetUnitService.createCabinetUnitAuto(cabinet, BrandDTO.corp._id);
        return null;
    }

    @Post("/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getCabinet(@Body("dto") dto: getCabinetDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getCabinetRes> {
        let results = await this.CabinetDao.query({ corpId: BrandDTO.corp._id });

        // 如果没有货架，则创建默认货架
        if (results.length === 0) {
            const cabinets = [];
            for (const recomand of RECOMAND_POUNDS_FORMULA.filter((e) => ["冷轧板", "冷轧卷", "费用"].includes(e.name))) {
                const schema = this.CabinetDao.getSchema();
                schema.corpId = BrandDTO.corp._id;
                const cabinet = await this.CabinetDao.create({ ...schema, ...recomand });
                cabinets.push(cabinet);
            }

            for (const cabinet of cabinets) {
                await this.cabinetUnitService.createCabinetUnitAuto(cabinet, BrandDTO.corp._id);
            }
        }

        return results;
    }

    @Patch()
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_CORE)
    async patchCabinet(@Body("dto") dto: patchCabinetDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<patchCabinetRes> {
        // 修改
        if (!dto.name) throw new Error("请输入货架名称");
        if (!dto.unit) throw new Error("请输入货架单位");

        const updater = {
            name: dto.name,
            unit: dto.unit,
            formula: dto.formula,
        };
        await this.CabinetDao.updateOne(dto._id, updater);
        return null;
    }

    @Post("/delete")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_CORE)
    async deleteCabinet(@Body("dto") dto: deleteCabinetDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<deleteCabinetRes> {
        const exist = await this.CabinetDao.findOne(dto.cabinetId);
        if (!exist) throw Error(`找不到货架`);

        const count = await this.CabinetDao.count({ corpId: BrandDTO.corp._id });
        if (count === 1) throw new Error(`至少需要一个货架`);

        await this.CabinetDao.delete(exist._id);

        const units = await this.CabinetUnitDao.query({ cabinetId: exist._id });
        await this.CabinetUnitDao.deleteMany(units.map((e) => e._id));
        return null;
    }
}
