import { Controller, Get, Post, Body, Patch, Delete, SetMetadata, UseGuards } from "@nestjs/common";

import { Page, PageRes, trimObject } from "qqlx-cdk";
import {
    PATH_SKU,
    ENUM_ORDER,
    ENUM_LAYOUT_CABINET,
    getSkuDto,
    getSkuRes,
    patchSkuDto,
    patchSkuRes,
    Sku,
    SkuJoined,
    getOrderInfoDto,
    getOrderInfoRes,
} from "qqlx-core";
import { BrandDTO } from "qqlx-sdk";

import { BrandGuard, ENUM_BRAND_ROLE_ALL, ENUM_BRAND_ROLE_NORMAL } from "global/brand.guard";
import { SkuDao } from "dao/sku";
import { OrderDao } from "dao/order";
import { SkuService } from "./service";

@Controller(PATH_SKU)
@UseGuards(BrandGuard)
export class SkuController {
    constructor(
        //
        private readonly SkuDao: SkuDao,
        private readonly OrderDao: OrderDao,
        private readonly SkuService: SkuService
    ) {
        this.init();
    }

    async init() {
        await this.SkuDao.updateMany({}, { keyHouse: "" });
        console.log("sku init keyhouse end");
    }

    @Post("/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getSku(@Body("dto") dto: getSkuDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getSkuRes> {
        const search = dto.search;
        trimObject(search);

        // 查询
        const base = {
            corpId: BrandDTO.corp._id,
            orderIsDisabled: false,
            isConfirmed: search.isConfirmed ? true : { $in: [true, false] },
            type: { $in: dto.types },
            layout:
                search.layout === ENUM_LAYOUT_CABINET.INDIVIDUAL
                    ? ENUM_LAYOUT_CABINET.INDIVIDUAL
                    : { $in: [ENUM_LAYOUT_CABINET.INDIVIDUAL, ENUM_LAYOUT_CABINET.SUMMARY] },
        };
        const query = {
            ...base,
            ...(search.name && { name: new RegExp(search.name) }),
            ...(search.norm && { norm: new RegExp(search.norm.replace(/\*/g, "\\*").replace(/\./g, "\\.")) }),
            ...(search.remark && { remark: new RegExp(search.remark) }),
            ...(search.keyOrigin && { keyOrigin: new RegExp(search.keyOrigin) }),
            ...(search.keyFeat && { keyFeat: new RegExp(search.keyFeat) }),
            ...(search.keyCode && { keyCode: new RegExp(search.keyCode) }),
            ...(search.warehouseId && { warehouseId: search.warehouseId }),
            ...(search.keyHouse && { keyCode: new RegExp(search.keyHouse) }),
            ...(search.orderContactId && { orderContactId: search.orderContactId }),
        };

        // 排序
        const option = {
            sortKey: dto.sortKey,
            sortValue: dto.sortValue,
            groupKey: dto.groupKey,
        };

        if (base.layout === ENUM_LAYOUT_CABINET.INDIVIDUAL) dto.page.startTime = 0;
        const page = (await this.SkuDao.page(query, dto.page, option)) as PageRes<SkuJoined>;
        page.list = await this.SkuService.getSkuJoined(
            page.list.map((e) => e._id),
            dto.sortKey,
            dto.sortValue
        );

        // View
        page.list.forEach((sku) => {
            sku.pounds /= 1000;
            sku.poundsFinal /= 1000;
            sku.price /= 100;
        });
        return page;
    }

    @Post("/rela-order/get")
    async getSkuRelaOrder(@Body("dto") dto: { deductionSkuId: string }, @Body("BrandDTO") BrandDTO: BrandDTO) {
        const base = { corpId: BrandDTO.corp?._id, orderIsDisabled: false, isConfirmed: true };
        // 入库
        const skus_getin = await this.SkuDao.query({
            ...base,
            _id: dto.deductionSkuId,
            type: ENUM_ORDER.GETIN,
        });

        // 领料
        const skus_material = await this.SkuDao.query({
            ...base,
            type: ENUM_ORDER.MATERIAL,
            deductionSkuId: dto.deductionSkuId,
        });

        // 加工
        const orders_process = await this.OrderDao.query({
            ...base,
            type: ENUM_ORDER.PROCESS,
            parentOrderId: { $in: [...new Set(skus_material.filter((e) => e.orderId).map((e) => e.orderId))] },
        });
        const skus_process = await this.SkuDao.query({
            ...base,
            type: ENUM_ORDER.PROCESS,
            orderId: { $in: orders_process.map((e) => e._id) },
        });

        // 发货
        const skus_getout = await this.SkuDao.query({
            ...base,
            type: ENUM_ORDER.GETOUT,
            deductionSkuId: dto.deductionSkuId,
        });

        // end
        const result = await this.SkuService.getSkuJoined([
            ...skus_getin.map((e) => e._id),
            ...skus_material.map((e) => e._id),
            ...skus_process.map((e) => e._id),
            ...skus_getout.map((e) => e._id),
        ]);
        result.forEach((e) => {
            e.pounds /= 1000;
            e.poundsFinal /= 1000;
        });
        return result;
    }

    @Patch()
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_NORMAL)
    async patchSku(@Body("dto") dto: patchSkuDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<patchSkuRes> {
        let exist = await this.SkuDao.findOne(dto.entity?._id);
        if (!exist) throw new Error(`找不到商品`);

        // if (dto.entity.deductionSkuId) {
        //     exist = await this.SkuDao.updateOne(exist._id, { deductionSkuId: dto.entity.deductionSkuId });
        // }

        if (exist.isConfirmed) {
            await this.SkuService.skuConfirmCancel(exist);
        } else {
            await this.SkuService.skuConfirm(exist);
        }

        return null;
    }
}
