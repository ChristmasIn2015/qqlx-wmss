import { Injectable } from "@nestjs/common";

import { trimObject } from "qqlx-cdk";
import { ENUM_ORDER, Cabinet, CabinetUnit } from "qqlx-core";

import { CorpLock } from "global/lock.corp";
import { SkuDao } from "dao/sku";
import { CabinetUnitDao } from "dao/cabinet";

const recommandMap = new Map<string, { name: string; norm: string }[]>();

{
    const list = [];
    for (let n of ["冷小板", "有花小板", "无花小板", "酸洗小板"]) {
        for (let h of ["0.5", "1.0", "1.5", "2.0"]) {
            list.push({ name: n, norm: h + "*1000*C" });
        }
    }
    for (let n of ["冷大板", "有花大板", "无花大板", "酸洗大板"]) {
        for (let h of ["0.5", "1.0", "1.5", "2.0"]) {
            list.push({ name: n, norm: h + "*1250*C" });
        }
    }
    recommandMap.set("冷轧卷", list);
}
{
    const list = [];
    for (let n of ["冷小板", "有花小板", "无花小板", "酸洗小板"]) {
        for (let h of ["0.5", "1.0", "1.5", "2.0"]) {
            list.push({ name: n, norm: h + "*1000*2000" });
        }
    }
    for (let n of ["冷大板", "有花大板", "无花大板", "酸洗大板"]) {
        for (let h of ["0.5", "1.0", "1.5", "2.0"]) {
            list.push({ name: n, norm: h + "*1250*2500" });
        }
    }
    recommandMap.set("冷轧板", list);
}
{
    const list = [];
    for (let n of ["螺母", "垫片"]) {
        for (let h of ["-"]) {
            list.push({ name: n, norm: h + "" });
        }
    }
    recommandMap.set("配件", list);
}
{
    const list = [];
    for (let n of ["运费", "加工费"]) {
        for (let h of ["-"]) {
            list.push({ name: n, norm: h + "" });
        }
    }
    recommandMap.set("费用", list);
}

@Injectable()
export class CabinetUnitService extends CorpLock {
    constructor(
        //
        private readonly SkuDao: SkuDao,
        private readonly CabinetUnitDao: CabinetUnitDao
    ) {
        super();
    }

    async createCabinetUnitAuto(entity: Cabinet, corpId: string) {
        const recommandUnits = this.getRecommandUnit(entity.name);
        if (recommandUnits && recommandUnits.length > 0) {
            const units = [];
            for (let rec of recommandUnits) {
                const schema = this.CabinetUnitDao.getSchema();
                schema.name = rec.name;
                schema.norm = rec.norm;
                units.push(schema);
            }
            await this.createCabinetUnit(entity, units, corpId);
        }
    }

    async createCabinetUnit(entity: Cabinet, schemas: CabinetUnit[], corpId: string): Promise<CabinetUnit[]> {
        if (schemas.length > 100) throw new Error(`上传限制 100 项`);

        const result = [];
        for (let schema of schemas || []) {
            const created = await this.createCabinetUnitSingle(entity, schema, corpId);
            result.push(created);
        }
        return result;
    }

    async createCabinetUnitSingle(entity: Cabinet, schema: CabinetUnit, corpId: string): Promise<CabinetUnit> {
        if (!corpId) throw new Error("请选择公司");
        if (!schema.name) throw new Error("请输入商品名称");
        if (!schema.norm) throw new Error("请输入商品规格");
        trimObject(schema);

        const exists = await this.CabinetUnitDao.query({ corpId, name: schema.name, norm: schema.norm });
        const exist = exists[0];
        if (exist) return exist;

        schema.corpId = corpId;
        schema.cabinetId = entity._id;
        schema.poundsFinal = 0;
        schema.countFinal = 0;
        schema.price = Number(schema.price) || 0;
        const created = await this.CabinetUnitDao.create(schema);
        return created;
    }

    getRecommandUnit(name: string): { name: string; norm: string }[] {
        const list = recommandMap.get(name);
        return list || [];
    }

    resetCabinetUnit(corpId: string, name: string, norm: string) {
        return new Promise((resolve, reject) => {
            const lock = this.getLock(corpId);
            lock.acquire("cabinet-unit", async () => {
                let errorMessage = null;
                try {
                    const query = { corpId, name, norm };
                    trimObject(query);

                    const units = await this.CabinetUnitDao.query(query);
                    const unit = units[0];
                    if (!unit) return;

                    // +入库单
                    const getin = { corpId, type: ENUM_ORDER.GETIN, isConfirmed: true, orderIsDisabled: false, name, norm };
                    const resultGetin = await this.getSkuAggre(getin);

                    // +生产单
                    const process = { corpId, type: ENUM_ORDER.PROCESS, isConfirmed: true, orderIsDisabled: false, name, norm };
                    const resultProcess = await this.getSkuAggre(process);

                    // -发货单
                    const getout = { corpId, type: ENUM_ORDER.GETOUT, isConfirmed: true, orderIsDisabled: false, name, norm, deductionSkuId: "" };
                    const resultGetout = await this.getSkuAggre(getout);

                    // -领料单
                    const material = { corpId, type: ENUM_ORDER.MATERIAL, isConfirmed: true, orderIsDisabled: false, name, norm, deductionSkuId: "" };
                    const resultMaterial = await this.getSkuAggre(material);

                    const updater = {
                        poundsFinal: resultGetin.poundsFinal + resultProcess.poundsFinal - resultGetout.poundsFinal - resultMaterial.poundsFinal,
                        countFinal: resultGetin.countFinal + resultProcess.countFinal - resultGetout.countFinal - resultMaterial.countFinal,
                    };
                    await this.CabinetUnitDao.updateOne(unit._id, updater);
                } catch (error) {
                    errorMessage = error.message;
                } finally {
                    errorMessage ? reject(errorMessage) : resolve(true);
                }
            });
        });
    }

    private async getSkuAggre(match) {
        const aggre = await this.SkuDao.aggregate([
            { $match: match },
            { $group: { _id: "result", poundsFinal: { $sum: "$poundsFinal" }, countFinal: { $sum: "$countFinal" } } },
        ]);

        return {
            poundsFinal: aggre[0]?.poundsFinal ?? 0,
            countFinal: aggre[0]?.countFinal ?? 0,
        };
    }
}
