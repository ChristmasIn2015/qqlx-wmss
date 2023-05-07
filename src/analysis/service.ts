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
}
