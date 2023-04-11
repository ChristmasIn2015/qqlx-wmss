import { Injectable } from "@nestjs/common";

import { trimObject, MongodbSort, Calculation } from "qqlx-cdk";
import { ENUM_ORDER, ENUM_LAYOUT_CABINET, Sku, SkuJoined, Order, OrderJoined } from "qqlx-core";

import { CorpLock } from "global/lock.corp";
import { SkuDao } from "dao/sku";
import { CabinetUnitService } from "src/cabinetUnit/service";

@Injectable()
export class SkuService extends CorpLock {
    constructor(
        //
        private readonly SkuDao: SkuDao,
        private readonly CabinetUnitService: CabinetUnitService
    ) {
        super();
    }

    /**
     * @pounds 000 kg
     * @count 个
     * @amount 00 分
     * */
    async createSku(schemaList: Sku[], order: Order): Promise<Calculation<Sku>> {
        const calculation: Calculation<Sku> = { list: [], pounds: 0, count: 0, amount: 0 };

        for (let schema of schemaList || []) {
            const entity = await this.createSkuSingle(schema, order);

            const isIndividual = entity.layout == ENUM_LAYOUT_CABINET.INDIVIDUAL;
            // 如果是 @入库 @加工 的商品
            const charge1 = [ENUM_ORDER.GETIN, ENUM_ORDER.PROCESS].includes(entity.type);
            // 如果是 @领料 的商品
            const charge2 = entity.type === ENUM_ORDER.MATERIAL && entity.deductionSkuId;
            // 发货，如果需要发货原材料并且已经包含扣减的原材料，则自动确认
            const charge3 = entity.type === ENUM_ORDER.GETOUT && (isIndividual ? !!entity.deductionSkuId : true);
            // 自动确认
            (charge1 || charge2 || charge3) && (await this.skuConfirm(entity));

            //
            calculation.list.push(entity);
            calculation.pounds += entity.pounds;
            calculation.count += entity.count;
            calculation.amount += entity.isPriceInPounds
                ? parseInt((entity.price * (entity.pounds / 1000)).toString())
                : parseInt((entity.price * entity.count).toString());
        }

        return calculation;
    }

    async createSkuSingle(schema: Sku, order: Order): Promise<Sku> {
        schema.type = order.type;
        schema.isConfirmed = false;
        schema.pounds = Number(schema.pounds) || 0;
        schema.count = Number(schema.count) || 0;
        schema.poundsFinal = schema.pounds;
        schema.countFinal = schema.count;
        // schema.deductionSkuId = "";

        schema.price = Number(schema.price);
        schema.isPriceInPounds = !!schema.isPriceInPounds;

        schema.corpId = order.corpId;
        schema.orderId = order._id;
        schema.orderContactId = order.contactId;
        schema.orderIsDisabled = false;

        schema.timeCreate = order.timeCreate;
        schema.timeUpdate = order.timeUpdate;
        const entity = await this.SkuDao.create(schema);

        return entity;
    }

    async getSkuJoined(ids: string[], sortKey: string = "timeCreate", sortValue: MongodbSort = MongodbSort.DES): Promise<SkuJoined[]> {
        const sort = {};
        sort[sortKey] = sortValue;

        const query: any = [
            { $match: { _id: { $in: ids } } },
            { $sort: sort },
            // { $lookup: { from: "warehouses", localField: "keyHouseId", foreignField: "_id", as: "joinWarehouse" } },
            { $lookup: { from: "orders", localField: "orderId", foreignField: "_id", as: "joinOrder" } },
            { $lookup: { from: "contacts", localField: "orderContactId", foreignField: "_id", as: "joinOrderContact" } },
        ];
        const skus: SkuJoined[] = await this.SkuDao.aggregate(query);

        skus.forEach((rela) => {
            rela.joinOrder && (rela.joinOrder = rela.joinOrder[0]);
            rela.joinOrderContact && (rela.joinOrderContact = rela.joinOrderContact[0]);
        });

        return skus;
    }

    private async getSkuMatched(match: Object, sortKey: string = "timeCreate", sortValue: MongodbSort = MongodbSort.DES): Promise<SkuJoined[]> {
        const sort = {};
        sort[sortKey] = sortValue;

        const query: any = [
            { $match: match },
            { $lookup: { from: "contacts", localField: "orderContactId", foreignField: "_id", as: "joinOrderContact" } },
            //
        ];
        const skus: SkuJoined[] = await this.SkuDao.aggregate(query);

        skus.forEach((rela) => {
            rela.joinOrderContact = rela.joinOrderContact[0];
        });

        return skus;
    }

    async setOrderSku(orders: OrderJoined[]): Promise<OrderJoined[]> {
        const skus = await this.getSkuMatched({ orderId: { $in: orders.map((e) => e._id) } });
        for (const order of orders) {
            order["joinSku"] = skus.filter((e) => e.orderId === order._id).reverse();
        }
        return orders;
    }

    /**
     * @pounds 000 kg
     * @count 个
     * @amount 00 分
     * */
    async getSkuCalculation(filter: Object): Promise<Calculation<Sku>> {
        const calculation: Calculation<Sku> = { list: [], pounds: 0, count: 0, amount: 0 };
        const skus = await this.SkuDao.query(filter);

        for (const entity of skus) {
            calculation.list.push(entity);
            calculation.pounds += entity.pounds;
            calculation.count += entity.count;
            calculation.amount += entity.isPriceInPounds
                ? parseInt((entity.price * (entity.pounds / 1000)).toString())
                : parseInt((entity.price * entity.count).toString());
        }

        return calculation;
    }

    async skuConfirm(exist: Sku) {
        if (exist.orderIsDisabled === false && exist?.isConfirmed === false) {
            await this.setSkuConfirm(exist);

            if ([ENUM_ORDER.GETIN, ENUM_ORDER.PROCESS, ENUM_ORDER.GETOUT, ENUM_ORDER.MATERIAL].includes(exist.type)) {
                // 计算发货、领料后的库存
                await this.CabinetUnitService.resetCabinetUnit(exist.corpId, exist.name, exist.norm);

                // 发货、领料有可能需要从入库库存中扣除本次消耗
                if (exist.deductionSkuId) {
                    const deductionSku = await this.resetDeductionSku(exist);
                    await this.CabinetUnitService.resetCabinetUnit(exist.corpId, deductionSku.name, deductionSku.norm);
                }
            }
        }
    }

    async skuConfirmCancel(exist: Sku) {
        if (exist.orderIsDisabled === false && exist?.isConfirmed === true) {
            await this.setSkuConfirmCancel(exist);

            if ([ENUM_ORDER.GETIN, ENUM_ORDER.PROCESS, ENUM_ORDER.GETOUT, ENUM_ORDER.MATERIAL].includes(exist.type)) {
                // 计算发货、领料后的库存
                await this.CabinetUnitService.resetCabinetUnit(exist.corpId, exist.name, exist.norm);

                // 发货、领料有可能需要从入库库存中扣除本次消耗
                if (exist.deductionSkuId) {
                    const deductionSku = await this.resetDeductionSku(exist);
                    await this.CabinetUnitService.resetCabinetUnit(exist.corpId, deductionSku.name, deductionSku.norm);
                }
            }
        }
    }

    async deleteSku(ids: string[]) {
        const skus = await this.SkuDao.query({ _id: { $in: ids } });
        for (let sku of skus) await this.skuConfirmCancel(sku);
        await this.SkuDao.deleteMany(skus.map((e) => e._id));
    }

    private resetDeductionSku(exist: Sku): Promise<Sku> {
        return new Promise((resolve, reject) => {
            const lock = this.getLock(exist.corpId);
            lock.acquire("cabinet-unit", async () => {
                let errorMessage = null;
                try {
                    // 入库库存
                    const deductionSku = await this.SkuDao.findOne(exist.deductionSkuId);
                    if (!deductionSku || ![ENUM_ORDER.GETIN, ENUM_ORDER.PROCESS].includes(deductionSku.type)) return;

                    // -发货库存 -领料库存
                    const match = {
                        corpId: exist.corpId,
                        deductionSkuId: deductionSku._id,
                        type: { $in: [ENUM_ORDER.GETOUT, ENUM_ORDER.MATERIAL] },
                        isConfirmed: true,
                        orderIsDisabled: false,
                    };
                    const aggre = await this.SkuDao.aggregate([
                        // 计算
                        { $match: match },
                        { $group: { _id: "result", pounds: { $sum: "$pounds" }, count: { $sum: "$count" } } },
                    ]);

                    const updater = {
                        poundsFinal: (deductionSku.pounds - (aggre[0]?.pounds ?? 0)) / 1000,
                        countFinal: deductionSku.count - (aggre[0]?.count ?? 0),
                    };
                    exist = await this.SkuDao.updateOne(deductionSku._id, updater);
                } catch (error) {
                    errorMessage = error.message;
                } finally {
                    errorMessage ? reject(errorMessage) : resolve(exist);
                }
            });
        });
    }

    private async setSkuConfirm(exist: Sku): Promise<Sku> {
        const updater = { isConfirmed: true };
        const sku = await this.SkuDao.updateOne(exist._id, updater);
        return sku;
    }

    private async setSkuConfirmCancel(exist: Sku): Promise<Sku> {
        const deductionSkuList = await this.SkuDao.query({ deductionSkuId: exist._id });
        const isGetOut = deductionSkuList.find((e) => e.type === ENUM_ORDER.GETOUT);
        const isMaterial = deductionSkuList.find((e) => e.type === ENUM_ORDER.MATERIAL);

        if (isGetOut) throw new Error(`此库存已经发货，请取消发货后重新尝试`);
        else if (isMaterial) throw new Error(`此库存已用于领料生产，请取消领料后重新尝试`);

        const updater = { isConfirmed: false };
        const sku = await this.SkuDao.updateOne(exist._id, updater);
        return sku;
    }
}
