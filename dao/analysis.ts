import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { Prop, Schema, SchemaFactory, InjectModel } from "@nestjs/mongoose";

import { ContactAnalysis as _, ENUM_ORDER, ENUM_PROJECT } from "qqlx-core";
import { MongooseDao } from "qqlx-sdk";

@Schema()
export class ContactAnalysis implements _ {
    @Prop({ default: "", required: true })
    corpId: string;
    @Prop({ default: "" })
    contactId: string;

    @Prop({
        default: ENUM_ORDER.NONE,
        enum: [
            ENUM_ORDER.NONE,
            ENUM_ORDER.PURCHASE,
            ENUM_ORDER.SALES,
            ENUM_ORDER.MATERIAL,
            ENUM_ORDER.PROCESS,
            ENUM_ORDER.GETIN,
            ENUM_ORDER.GETOUT,
            ENUM_ORDER.TRANSFORM_CUSTOMER,
            ENUM_ORDER.TRANSFORM_MERCHANT,
        ],
    })
    type: ENUM_ORDER;
    @Prop({ default: 0 })
    count: number;
    @Prop({
        default: 0,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    amountOrder: number;
    @Prop({
        default: 0,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    amountBookOfOrder: number;
    @Prop({
        default: 0,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    amountBookOfOrderRest: number;

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
export const ContactAnalysisSchema = SchemaFactory.createForClass(ContactAnalysis).set("versionKey", false);

@Injectable()
export class ContactAnalysisDao extends MongooseDao<ContactAnalysis> {
    constructor(@InjectModel(ContactAnalysis.name) private model: Model<ContactAnalysis>) {
        super(model);
    }
}
