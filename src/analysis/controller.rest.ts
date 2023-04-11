import { Controller, Get, Post, Body, Patch, Delete, SetMetadata, UseGuards } from "@nestjs/common";

import { trimObject } from "qqlx-cdk";
import { ENUM_ORDER, PATH_ORDER_ANALYSIS, getOrderAnalysisDto, getOrderAnalysisRes } from "qqlx-core";
import { BrandDTO } from "qqlx-sdk";

import { BrandGuard, ENUM_BRAND_ROLE_ALL } from "global/brand.guard";
import { OrderDao } from "dao/order";

@Controller()
@UseGuards(BrandGuard)
export class AnalysisController {
    constructor(
        //
        private readonly OrderDao: OrderDao
    ) {}

    @Post(PATH_ORDER_ANALYSIS + "/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getOrderAnalysis(@Body("dto") dto: getOrderAnalysisDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getOrderAnalysisRes> {
        const results = [];

        for (const query of dto) {
            const match = {
                corpId: BrandDTO.corp._id,
                type: ENUM_ORDER.NONE,
                isDisabled: false,
                timeCreate: { $gte: query.startTime || 0, $lte: query.endTime || Date.now() },
            };

            // 销售
            match.type = ENUM_ORDER.SALES;
            const counter = await this.OrderDao.aggregate([
                //
                { $match: match },
                { $group: { _id: "result", amount: { $sum: "$amount" }, count: { $sum: 1 } } },
            ]);

            // 返回
            const calcu = {};
            calcu[ENUM_ORDER.SALES] = {
                amount: (counter[0]?.amount ?? 0) / 100,
                count: counter[0]?.count ?? 0,
            };
            results.push({
                startTime: query.startTime,
                endTime: query.endTime,
                calcu,
            });
        }
        return results;
    }
}
