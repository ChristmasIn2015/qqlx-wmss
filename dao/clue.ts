import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { Prop, Schema, SchemaFactory, InjectModel } from "@nestjs/mongoose";

import { Clue as _, ENUM_PROJECT } from "qqlx-core";
import { MongooseDao } from "qqlx-sdk";

@Schema()
export class Clue implements _ {
    @Prop({ default: "", required: true })
    corpId: string;
    @Prop({
        default: ENUM_PROJECT.KDBGS,
        enum: [ENUM_PROJECT.KDBGS, ENUM_PROJECT.OA],
    })
    scope: ENUM_PROJECT;
    @Prop({ default: "" })
    content: string;

    @Prop({ required: true })
    _id: string;
    @Prop({ default: 0 })
    timeCreate: number;
    @Prop({ default: 0 })
    timeUpdate: number;
    @Prop({ default: "" })
    timeCreateString: string;
    @Prop({ default: "" })
    timeUpdateString: string;
}
export const ClueSchema = SchemaFactory.createForClass(Clue).set("versionKey", false);

@Injectable()
export class ClueDao extends MongooseDao<Clue> {
    constructor(@InjectModel(Clue.name) private model: Model<Clue>) {
        super(model);
    }
}
