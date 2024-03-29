import { Controller, Get, Post, Body, Patch, Put, SetMetadata, UseGuards } from "@nestjs/common";

import { PageRes, getRangeMonth, trimObject } from "qqlx-cdk";
import {
    ENUM_ORDER,
    PATH_ORDER,
    postOrderDto,
    postOrderRes,
    getOrderDto,
    getOrderRes,
    getOrderGroupDto,
    getOrderGroupRes,
    putOrderDto,
    putOrderRes,
    deleteOrderDto,
    deleteOrderRes,
    OrderJoined,
    getOrderInfoDto,
    getOrderInfoRes,
    BookOfOrder,
    Order,
    ENUM_BRAND_ROLE,
} from "qqlx-core";
import { BrandDTO } from "qqlx-sdk";

import { TimeLog } from "global/time.decorate";
import { BrandGuard, ENUM_BRAND_ROLE_ALL, ENUM_BRAND_ROLE_NORMAL } from "global/brand.guard";

import { CorpLock } from "global/lock.corp";
import { UserRemote } from "remote/user";
import { MarketRemote } from "remote/market";
import { BrandRemote } from "remote/brand";

import { SkuDao } from "dao/sku";
import { OrderDao } from "dao/order";
import { BookOfOrderDao } from "dao/book";
import { OrderService } from "src/order/service";
import { SkuService } from "src/sku/service";
import { BookService } from "src/book/service";
import { JoinService } from "src/join/service";
import { ClueService } from "src/clue/service";
import { AnalysisService } from "src/analysis/service";

@Controller(PATH_ORDER)
@UseGuards(BrandGuard)
export class OrderController extends CorpLock {
    constructor(
        private readonly SkuService: SkuService,
        private readonly OrderService: OrderService,
        private readonly JoinService: JoinService,
        private readonly ClueService: ClueService,
        // private readonly AnalysisService: AnalysisService,
        // private readonly MarketRemote: MarketRemote,
        // private readonly BrandRemote: BrandRemote,
        private readonly UserRemote: UserRemote,
        //

        private readonly SkuDao: SkuDao,
        private readonly OrderDao: OrderDao,
        private readonly BookOfOrderDao: BookOfOrderDao
    ) {
        super();
    }

    @Post()
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_NORMAL)
    async postOrder(@Body("dto") dto: postOrderDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<postOrderRes> {
        const schema = dto.schema;

        // 校验
        await this.OrderService.chargeOrder(BrandDTO.corp?._id, BrandDTO.userInfo?.userId, {
            orderType: schema.type,
            parentOrderId: schema.parentOrderId,
            parentOrderType: schema.parentOrderType,
        });

        // 创建订单
        schema.corpId = BrandDTO.corp._id;
        schema.creatorId = BrandDTO.userInfo.userId;
        schema.code = await this.getCode(BrandDTO.corp._id, schema.type);
        schema.timeContract = Date.now();
        const entity = await this.OrderDao.create(schema);

        // 关联Sku更新
        if (dto.skuList?.length > 0) {
            await this.SkuService.createSku(dto.skuList, entity);
        }

        // 关联信息更新
        await this.JoinService.resetOrderAmount(BrandDTO.corp._id, entity._id);
        await this.JoinService.resetOrderContact(BrandDTO.corp._id, entity._id);

        // 日志
        this.ClueService.insertOrderCreation(BrandDTO, entity); //async
        return entity;
    }

    @Post("/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getOrder(@Body("dto") dto: getOrderDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getOrderRes> {
        const search = dto.search;
        trimObject(search);

        const query = {
            corpId: BrandDTO.corp._id,
            type: search.type,
            isDisabled: search.isDisabled,
            ...(search?.contactId && { contactId: search.contactId }),
            ...(search?.code && { code: new RegExp(search.code) }),
            ...(search?.remark && { remark: new RegExp(search.remark) }),
            // 仅仅查询手动入库的入库订单
            ...(search.type === ENUM_ORDER.GETIN && search.parentOrderId === "" && { parentOrderId: search.parentOrderId }),
            ...(search.isNotTax === true && { isNotTax: { $ne: true } }),
        };

        if (dto.requireManagerId) query["managerId"] = "";
        if (dto.requireAccounterId) query["accounterId"] = "";

        // 排序
        const option = { sortKey: dto.sortKey, sortValue: dto.sortValue };

        // 查询（并匹配用户信息）
        const page = await this.OrderDao.page(query, dto.page, option);
        await this.OrderService.setOrderJoined(page.list, { corpId: BrandDTO.corp?._id, joinSku: dto.joinSku });

        // View
        page.list.forEach((order: OrderJoined) => {
            order.amount /= 100;
            order.amountBookOfOrder /= 100;
            order.amountBookOfOrderRest /= 100;
            order.amountBookOfOrderVAT /= 100;
            order.amountBookOfOrderVATRest /= 100;
            order.joinSku.map((sku) => {
                sku.pounds /= 1000;
                sku.price /= 100;
                return sku;
            });
        });
        return page as PageRes<OrderJoined>;
    }

    @Post("/group/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getOrderGroup(@Body("dto") dto: getOrderGroupDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getOrderGroupRes> {
        const search = dto.search;
        trimObject(search);

        const query = {
            corpId: BrandDTO.corp._id,
            type: search.type,
            isDisabled: search.isDisabled,
            ...(search?.contactId && { contactId: search.contactId }),
            ...(search?.code && { code: new RegExp(search.code) }),
            ...(search?.remark && { code: new RegExp(search.remark) }),
            // 仅仅查询手动入库的入库订单
            ...(search.type === ENUM_ORDER.GETIN && search.parentOrderId === "" && { parentOrderId: search.parentOrderId }),
            ...(search.isNotTax === true && { isNotTax: { $ne: true } }),
            timeCreate: {
                $gte: dto.page?.startTime || 0,
                $lte: dto.page?.endTime || Date.now(),
            },
        };

        if (dto.requireManagerId) query["managerId"] = "";
        if (dto.requireAccounterId) query["accounterId"] = "";

        // group
        const aggre = await this.OrderDao.aggregate([
            { $match: query },
            {
                $group: {
                    _id: "_id",
                    amount: { $sum: "$amount" },
                    amountBookOfOrder: { $sum: "$amountBookOfOrder" },
                    amountBookOfOrderRest: { $sum: "$amountBookOfOrderRest" },
                    amountBookOfOrderVAT: { $sum: "$amountBookOfOrderVAT" },
                    amountBookOfOrderVATRest: { $sum: "$amountBookOfOrderVATRest" },
                },
            },
        ]);

        return {
            amount: (aggre[0]?.amount ?? 0) / 100,
            amountBookOfOrder: (aggre[0]?.amountBookOfOrder ?? 0) / 100,
            amountBookOfOrderRest: (aggre[0]?.amountBookOfOrderRest ?? 0) / 100,
            amountBookOfOrderVAT: (aggre[0]?.amountBookOfOrderVAT ?? 0) / 100,
            amountBookOfOrderVATRest: (aggre[0]?.amountBookOfOrderVATRest ?? 0) / 100,
        };
    }

    @Put()
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_NORMAL)
    async putOrder(@Body("dto") dto: putOrderDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<putOrderRes> {
        const order = await this.OrderDao.findOne(dto.entity._id);
        if (order.isDisabled) throw new Error(`订单已删除，请恢复后试试`);
        if (order.type === ENUM_ORDER.MATERIAL) throw new Error(`无法修改领料单`);

        const updater = {
            contactId: dto.entity.contactId,
            managerId: dto.entity.managerId,
            accounterId: dto.entity.accounterId,
            remark: dto.entity.remark,
            timeContract: dto.entity.timeContract,
            isNotTax: !!dto.entity.isNotTax,
        };

        // sku
        if (dto.skuList && dto.skuList.length > 0) {
            if (order.managerId) throw Error(`单据已签字！`);
            else if (order.accounterId) throw Error(`财务已签字！`);
            const skus = await this.SkuDao.query({ corpId: BrandDTO.corp._id, orderId: order._id });
            const skuIds = skus.map((e) => e._id);
            await this.SkuService.deleteSku(skuIds);
            await this.SkuService.createSku(dto.skuList, order);
        }

        // 更新
        const entity = await this.OrderDao.updateOne(order._id, updater);

        // 关联信息更新
        await this.JoinService.resetOrderAmount(BrandDTO.corp._id, entity._id);
        await this.JoinService.resetOrderContact(BrandDTO.corp._id, entity._id);

        // 日志
        this.ClueService.insertOrderEdition(BrandDTO, entity); //async
        return entity;
    }

    @Post("/delete")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_NORMAL)
    async deleteOrder(@Body("dto") dto: deleteOrderDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<deleteOrderRes> {
        const order = await this.OrderDao.findOne(dto.orderId);
        if (order.managerId) throw Error(`单据已签字！`);
        else if (order.accounterId) throw Error(`财务已签字！`);

        // 删除订单
        if (order.isDisabled === false) {
            // 关联订单
            if (order.parentOrderId) {
                const parent = await this.OrderDao.findOne(order.parentOrderId);
                if (parent.managerId) throw new Error(`来源单据已签字，请检查后重新尝试`);
                else if (parent.accounterId) throw new Error(`财务已对来源单据签字，请检查后重新尝试`);
            }

            const childs = await this.OrderDao.count({ corpId: BrandDTO.corp._id, parentOrderId: order._id, isDisabled: false });
            if (childs > 0) throw new Error(`检查到其他订单，请删除后重新尝试`);

            const calcu = await this.SkuService.getSkuCalculation({ corpId: BrandDTO.corp._id, orderId: order._id, orderIsDisabled: false });
            for (let sku of calcu.list) {
                await this.SkuService.skuConfirmCancel(sku);
                await this.SkuDao.updateOne(sku._id, { orderIsDisabled: true });
            }

            const updater = { isDisabled: true };
            await this.OrderDao.updateOne(order._id, updater);
        }

        // 恢复订单
        else if (order.isDisabled === true) {
            const updater = { isDisabled: false };
            await this.OrderDao.updateOne(order._id, updater);
            //
            const calcu = await this.SkuService.getSkuCalculation({ corpId: BrandDTO.corp._id, orderId: order._id });
            for (let sku of calcu.list) {
                await this.SkuDao.updateOne(sku._id, { orderIsDisabled: false });
            }
        }

        // 关联信息更新
        await this.JoinService.resetOrderAmount(BrandDTO.corp._id, order._id);
        return null;
    }

    @Post("/info/get")
    @SetMetadata("BrandRole", ENUM_BRAND_ROLE_ALL)
    async getOrderInfo(@Body("dto") dto: getOrderInfoDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getOrderInfoRes> {
        const { orderId } = dto;
        const match = { orderId, corpId: BrandDTO.corp._id };
        const order = await this.OrderDao.findOne(orderId);
        if (!order) throw new Error(`订单异常`);

        const infos = await Promise.all([
            this._getOrderSkus(match),
            this._getOrderBooks(order._id),
            this.UserRemote.getUserInfoList({ userIds: [order.creatorId, order.managerId, order.accounterId] }),
            this.OrderDao.query({
                $or: [
                    { _id: order.parentOrderId, isDisabled: false },
                    { parentOrderId: order._id, isDisabled: false },
                ],
            }),
        ]);

        // View
        return {
            amount: order.amount / 100,
            skuList: infos[0],
            bookOfOrderList: infos[1],
            //@ts-ignore
            joinCreator: infos[2].find((u) => u.userId === order.creatorId),
            //@ts-ignore
            joinManager: infos[2].find((u) => u.userId === order.managerId),
            //@ts-ignore
            joinAccounter: infos[2].find((u) => u.userId === order.accounterId),
            //@ts-ignore
            joinChildOrder: infos[3].filter((e) => e.parentOrderId === order._id),
            //@ts-ignore
            joinParentOrder: infos[3].filter((e) => e._id === order.parentOrderId),
        };
    }

    private async _getOrderSkus(match: Record<string, any>) {
        const skus = await this.SkuDao.query(match);
        const SkuJoineds = await this.SkuService.getSkuJoined(skus.map((e) => e._id));

        return SkuJoineds.map((sku) => {
            sku.pounds /= 1000;
            sku.poundsFinal /= 1000;
            sku.price /= 100;
            return sku;
        });
    }

    private async _getOrderBooks(orderId: string) {
        const bookOfOrders = await this.BookOfOrderDao.aggregate([
            { $match: { orderId } },
            { $lookup: { from: "books", localField: "bookId", foreignField: "_id", as: "joinBook" } },
        ]);
        bookOfOrders.forEach((e) => {
            e.amount /= 100;
            e.joinBook && (e.joinBook = e.joinBook[0]) && (e.joinBook.amount /= 100);
        });
        return bookOfOrders;
    }

    private getCode(corpId: string, type: ENUM_ORDER): Promise<string> {
        return new Promise((resolve) => {
            const lock = this.getLock(corpId);
            lock.acquire("order-code", async () => {
                let title = "";
                if (type === ENUM_ORDER.PURCHASE) title += "CG";
                else if (type === ENUM_ORDER.SALES) title += "XS";
                else if (type === ENUM_ORDER.GETIN) title += "RK";
                else if (type === ENUM_ORDER.PROCESS) title += "JG";
                else if (type === ENUM_ORDER.GETOUT) title += "FH";
                else if (type === ENUM_ORDER.MATERIAL) title += "LL";

                const range = getRangeMonth();
                const date = new Date(range.startTime);
                const yearStr = date.getFullYear();
                const month = date.getMonth() + 1;
                const monthStr = month < 10 ? `0${month}` : String(month);

                const count = await this.OrderDao.count({ corpId, type }, range);
                resolve(`${title}-${yearStr}${monthStr}-${count + 1}`);
            });
        });
    }
}
