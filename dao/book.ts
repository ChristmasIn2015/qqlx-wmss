import { Injectable } from "@nestjs/common";
import { Schema, Prop, SchemaFactory, InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { Book as _Book, BookOfOrder as _BookOfOrder, BookOfSelf as _BookOfSelf, ENUM_BOOK_TYPE, ENUM_BOOK_DIRECTION } from "qqlx-core";
import { MongooseDao } from "qqlx-sdk";

@Schema()
export class Book implements _Book {
    @Prop({ default: "", required: true })
    corpId: string;

    @Prop({
        default: ENUM_BOOK_TYPE.YSZK,
        enum: [ENUM_BOOK_TYPE.YSZK, ENUM_BOOK_TYPE.YSZK_VAT, ENUM_BOOK_TYPE.YFZK, ENUM_BOOK_TYPE.YFZK_VAT],
    })
    type: ENUM_BOOK_TYPE;
    @Prop({
        default: ENUM_BOOK_DIRECTION.JIE,
        enum: [ENUM_BOOK_DIRECTION.JIE, ENUM_BOOK_DIRECTION.DAI],
    })
    direction: ENUM_BOOK_DIRECTION;

    @Prop({ default: "" })
    code: string;
    @Prop({
        default: 0,
        get: (value) => (Number(value) || 0) / 100,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    amount: number;
    @Prop({ default: "" })
    remark: string;
    @Prop({ default: false })
    isDisabled: Boolean;

    @Prop({ default: "" })
    keyCode: string;
    @Prop({ default: "" })
    keyOrigin: string;
    @Prop({ default: "" })
    keyHouse: string;

    @Prop({
        default: 0,
        get: (value) => (Number(value) || 0) / 100,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    amountBookOfOrder: number;
    @Prop({
        default: 0,
        get: (value) => (Number(value) || 0) / 100,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    amountBookOfOrderRest: number;

    @Prop({
        default: 0,
        get: (value) => (Number(value) || 0) / 100,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    amountBookOfSelf: number;
    @Prop({
        default: 0,
        get: (value) => (Number(value) || 0) / 100,
        set: (value) => parseInt(((Number(value) || 0) * 100).toString()),
    })
    amountBookOfSelfRest: number;

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
export const BookSchema = SchemaFactory.createForClass(Book).set("versionKey", false);

@Injectable()
export class BookDao extends MongooseDao<Book> {
    constructor(@InjectModel(Book.name) private model: Model<Book>) {
        super(model);
    }
}

@Schema()
export class BookOfOrder implements _BookOfOrder {
    @Prop({ default: "", required: true })
    bookId: string;
    @Prop({ default: "", required: true })
    orderId: string;
    @Prop({ default: "" })
    orderContactId: string;
    @Prop({
        default: 0,
        get: (value) => (Number(value) || 0) / 100,
        set: (value) => (Number(value) || 0) * 100,
    })
    amount: number;

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
export const BookOfOrderSchema = SchemaFactory.createForClass(BookOfOrder).set("versionKey", false);

@Injectable()
export class BookOfOrderDao extends MongooseDao<BookOfOrder> {
    constructor(@InjectModel(BookOfOrder.name) private model: Model<BookOfOrder>) {
        super(model);
    }
}

@Schema()
export class BookOfSelf implements _BookOfSelf {
    @Prop({ default: "", required: true })
    invoiceId: string;
    @Prop({ default: "", required: true })
    bookId: string;
    @Prop({
        default: 0,
        get: (value) => (Number(value) || 0) / 100,
        set: (value) => (Number(value) || 0) * 100,
    })
    amount: number;

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
export const BookOfSelfSchema = SchemaFactory.createForClass(BookOfSelf).set("versionKey", false);

@Injectable()
export class BookOfSelfDao extends MongooseDao<BookOfSelf> {
    constructor(@InjectModel(BookOfSelf.name) private model: Model<BookOfSelf>) {
        super(model);
    }
}
