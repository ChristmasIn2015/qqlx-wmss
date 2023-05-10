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
    recommandMap.set("费用", [
        { name: "运费", norm: "-" },
        { name: "加工费", norm: "-" },
    ]);
}
recommandMap.set("焊管", [{ name: "焊管", norm: "273*20" }]);
recommandMap.set("圆管（米）", [{ name: "圆管", norm: "273*20" }]);
recommandMap.set("方管（米）", [{ name: "方管", norm: "200*10" }]);
recommandMap.set("矩形方管（米）", [{ name: "矩形方管", norm: "200*100*10" }]);
recommandMap.set("圆管（支）", [{ name: "圆管", norm: "273*20*6000" }]);
recommandMap.set("方管（支）", [{ name: "方管", norm: "200*10*6000" }]);
recommandMap.set("矩形方管（支）", [{ name: "矩形方管", norm: "200*100*10*6000" }]);
recommandMap.set("等边角钢", [{ name: "等边角钢", norm: "50*5" }]);
recommandMap.set("不等边角钢", [{ name: "不等边角钢", norm: "60*40*5" }]);
recommandMap.set("H型钢", [{ name: "H型钢", norm: "400*150*8*13" }]);

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
        const recommandUnits = recommandMap.get(entity.name);
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

                    const base = { corpId, isConfirmed: true, orderIsDisabled: false, name, norm };
                    const getin = { ...base, type: ENUM_ORDER.GETIN }; // +入库单
                    const process = { ...base, type: ENUM_ORDER.PROCESS }; // +生产单
                    const getout = { ...base, type: ENUM_ORDER.GETOUT, deductionSkuId: "" }; // -发货单
                    const material = { ...base, type: ENUM_ORDER.MATERIAL, deductionSkuId: "" }; // -领料单

                    const infos = await Promise.all([this.getSkuAggre(getin), this.getSkuAggre(process), this.getSkuAggre(getout), this.getSkuAggre(material)]);
                    const resultGetin = infos[0];
                    const resultProcess = infos[1];
                    const resultGetout = infos[2];
                    const resultMaterial = infos[3];

                    const updater = {
                        poundsFinal: resultGetin.poundsFinal + resultProcess.poundsFinal - resultGetout.poundsFinal - resultMaterial.poundsFinal,
                        countFinal: resultGetin.countFinal + resultProcess.countFinal - resultGetout.countFinal - resultMaterial.countFinal,
                    };
                    updater.poundsFinal /= 1000;
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
