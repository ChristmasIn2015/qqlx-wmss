import { Injectable } from "@nestjs/common";

import { MongodbSort } from "qqlx-cdk";
import { Clue, ENUM_PROJECT } from "qqlx-core";

import { ClueDao } from "dao/clue";

@Injectable()
export class ClueService {
    constructor(
        //
        private readonly ClueDao: ClueDao
    ) {}

    async create(content: string) {
        const schema = this.ClueDao.getSchema();
        schema.scope = ENUM_PROJECT.KDBGS;
        schema.content = content;
        await this.ClueDao.create(schema);
    }
}
