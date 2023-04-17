import { Injectable } from "@nestjs/common";

import { MongodbSort } from "qqlx-cdk";
import { Clue, ENUM_ORDER, ENUM_PROJECT, Order } from "qqlx-core";
import { BrandDTO } from "qqlx-sdk";

import { CorpLock } from "global/lock.corp";
import { ContactAnalysisDao } from "dao/analysis";
import { OrderDao } from "dao/order";

@Injectable()
export class AnalysisService extends CorpLock {
    constructor(
        //
        private readonly OrderDao: OrderDao,
        private readonly ContactAnalysisDao: ContactAnalysisDao
    ) {
        super();
    }

    async updateContactAnalysis(corpId: string, contactId: string) {
        const lock = this.getLock(corpId);
        lock.acquire("amount-book11", () => {
            return new Promise(async (resolve, reject) => {
                try {
                    const match = { corpId, contactId, type: ENUM_ORDER.SALES };
                    const count = await this.ContactAnalysisDao.count(match);
                    if (count === 0) await this.ContactAnalysisDao.create(match);

                    const exists = await this.ContactAnalysisDao.query(match);
                    const exist = exists[0];
                    const group = await this.OrderDao.aggregate([
                        { $match: { ...match, isDisabled: false } },
                        {
                            $group: {
                                _id: "_",
                                count: { $sum: 1 },
                                amountOrder: { $sum: "$amount" },
                                amountBookOfOrder: { $sum: "$amountBookOfOrder" },
                                amountBookOfOrderRest: { $sum: "$amountBookOfOrderRest" },
                            },
                        },
                    ]);
                    const updater = {
                        count: Number(group[0]?.count ?? 0),
                        amountOrder: Number(group[0]?.amountOrder ?? 0) / 100,
                        amountBookOfOrder: Number(group[0]?.amountBookOfOrder ?? 0) / 100,
                        amountBookOfOrderRest: Number(group[0]?.amountBookOfOrderRest ?? 0) / 100,
                    };
                    await this.ContactAnalysisDao.updateOne(exist._id, updater);
                    resolve(true);
                } catch (error) {
                    reject((error as Error).message);
                }
            });
        });
    }
}
