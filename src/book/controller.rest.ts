import { Controller, Get, Post, Body, Patch, Put, SetMetadata, UseGuards } from "@nestjs/common";

import { trimObject, getRangeMonth } from "qqlx-cdk";
import {
    ENUM_BRAND_ROLE,
    ENUM_BOOK_TYPE,
    ENUM_BOOK_DIRECTION,
    PATH_BOOK,
    postBookDto,
    postBookRes,
    getBookDto,
    getBookRes,
    putBookDto,
    putBookRes,
    deleteBookDto,
    deleteBookRes,
    Book,
    BookOfOrder,
    BookJoined,
} from "qqlx-core";
import { BrandDTO } from "qqlx-sdk";

import { BrandGuard, ENUM_BRAND_ROLE_ALL } from "global/brand.guard";
import { CorpLock } from "global/lock.corp";
import { BookDao, BookOfOrderDao } from "dao/book";
import { BookService } from "src/book/service";
import { JoinService } from "src/join/service";

@Controller(PATH_BOOK)
@UseGuards(BrandGuard)
export class BookController extends CorpLock {
    constructor(
        private readonly JoinService: JoinService,
        private readonly bookService: BookService,
        //
        private readonly BookDao: BookDao,
        private readonly BookOfOrderDao: BookOfOrderDao
    ) {
        super();
    }

    @Post()
    @SetMetadata("BrandRole", [ENUM_BRAND_ROLE.ROOT, ENUM_BRAND_ROLE.FINANCE])
    async postBook(@Body("dto") dto: postBookDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<postBookRes> {
        if (dto.excels?.length > 100) throw new Error(`上传限制 100 项`);

        const entitys: Book[] = [];
        for (let schema of dto.excels) {
            schema.corpId = BrandDTO.corp._id;
            schema.code = await this.getCode(BrandDTO.corp._id, schema.direction, schema.type, schema.timeCreate);
            schema.amount = Number(schema.amount);
            schema.amountBookOfOrderRest = schema.amount;
            const entity = await this.BookDao.create(schema);
            entitys.push(entity);
        }

        return entitys.map((e) => {
            e.amount /= 100;
            e.amountBookOfOrder /= 100;
            e.amountBookOfOrderRest /= 100;
            return e;
        });
    }

    @Post("/get")
    @SetMetadata("WMSS", ENUM_BRAND_ROLE_ALL)
    async getBook(@Body("dto") dto: getBookDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<getBookRes> {
        const search = dto.search;
        trimObject(dto.search);

        const query = {
            corpId: BrandDTO.corp._id,
            type: search.type,
            direction: search.direction,
            isDisabled: search.isDisabled,
            ...(search.code && { code: new RegExp(search.code) }),
            ...(search.remark && { remark: new RegExp(search.remark) }),
            ...(search.keyOrigin && { keyOrigin: new RegExp(search.keyOrigin) }),
            ...(search.keyCode && { keyCode: new RegExp(search.keyCode) }),
            ...(search.keyHouse && { keyHouse: search.keyHouse }),
        };

        // 排序
        const option = {
            sortKey: dto.sortKey,
            sortValue: dto.sortValue,
            groupKey: "amount",
        };

        // 正常查询
        const page = await this.BookDao.page(query, dto.page, option);

        // 匹配
        const order_ofs = await this.bookService.getBookOfOrder(page.list.map((e) => e._id));
        (page.list as BookJoined[]).forEach((book) => {
            book.amount /= 100;
            book.amountBookOfOrder /= 100;
            book.amountBookOfOrderRest /= 100;

            book.joinBookOfOrder = order_ofs.filter((ee) => ee.bookId === book._id);
            book.joinBookOfOrder.forEach((e) => {
                e.amount /= 100;
                e.joinOrder.amount /= 100;
                e.joinOrder.amountBookOfOrder /= 100;
                e.joinOrder.amountBookOfOrderRest /= 100;
                e.joinOrder.amountBookOfOrderVAT /= 100;
                e.joinOrder.amountBookOfOrderVATRest /= 100;
            });
        });

        return page;
    }

    @Put()
    @SetMetadata("BrandRole", [ENUM_BRAND_ROLE.ROOT, ENUM_BRAND_ROLE.FINANCE])
    async putBook(@Body("dto") dto: putBookDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<putBookRes> {
        const isInvoice =
            (dto.entity.type === ENUM_BOOK_TYPE.YSZK_VAT && dto.entity.direction === ENUM_BOOK_DIRECTION.JIE) ||
            (dto.entity.type === ENUM_BOOK_TYPE.YFZK_VAT && dto.entity.direction === ENUM_BOOK_DIRECTION.DAI);

        const updater = {
            remark: dto.entity.remark,
            ...(isInvoice && { amount: Number(dto.entity.amount) }),
            ...(isInvoice && { keyCode: dto.entity.keyCode }),
            ...(isInvoice && { keyOrigin: dto.entity.keyOrigin }),
            ...(isInvoice && { keyHouse: dto.entity.keyHouse }),
            ...(dto.entity.timeCreate && { timeCreate: Number(dto.entity.timeCreate) }),
        };
        const entity = await this.BookDao.updateOne(dto.entity._id, updater);
        if (entity.isDisabled === true) return null;

        // 订单相关
        if (dto.orders) {
            await this.bookService.deleteBookOfOrders(BrandDTO.corp._id, [entity._id]);
            for (const order of dto.orders) {
                const schema = this.BookOfOrderDao.getSchema();
                schema.bookId = entity._id;
                schema.bookType = entity.type;
                schema.bookDirection = entity.direction;

                schema.orderId = order._id;
                schema.orderType = order.type;
                schema.orderContactId = order.contactId;

                schema.amount = Number(order.amount) || 0;
                schema.amount > 0 && (await this.BookOfOrderDao.create(schema));
                await this.JoinService.resetOrderAmount(BrandDTO.corp._id, order._id);
            }
        }

        await this.JoinService.resetAmountBook(BrandDTO.corp._id, entity._id);
        return null;
    }

    @Post("/delete")
    @SetMetadata("BrandRole", [ENUM_BRAND_ROLE.ROOT, ENUM_BRAND_ROLE.FINANCE])
    async deleteBook(@Body("dto") dto: deleteBookDto, @Body("BrandDTO") BrandDTO: BrandDTO): Promise<deleteBookRes> {
        const deleting: Book[] = [];

        for (const id of dto.bookIds || []) {
            const exist = await this.BookDao.findOne(id);
            if (exist) {
                const wanner = !exist.isDisabled;
                const updater = { isDisabled: wanner };
                if (wanner === true) deleting.push(exist);
                await this.BookDao.updateOne(exist._id, updater);
            }
        }

        if (deleting.length > 0) {
            await this.bookService.deleteBookOfOrders(
                BrandDTO.corp._id,
                deleting.map((e) => e._id)
            );
            for (let book of deleting) await this.JoinService.resetAmountBook(BrandDTO.corp._id, book._id);
        }

        return null;
    }

    private getCode(corpId: string, direction: ENUM_BOOK_DIRECTION, type: ENUM_BOOK_TYPE, timeCreate: number): Promise<string> {
        return new Promise((resolve) => {
            const lock = this.getLock(corpId);
            lock.acquire("book-code", async () => {
                const date = new Date(timeCreate);
                const _month = date.getMonth();
                const startTime = new Date(date.getFullYear(), _month, 1).getTime();
                const endTime = new Date(date.getFullYear(), _month === 11 ? 0 : _month + 1, 0).getTime() + 86400000 - 1;

                const count = await this.BookDao.count({ corpId, direction, type }, { startTime, endTime });

                const yearStr = date.getFullYear();
                const month = date.getMonth() + 1;
                const monthStr = month < 10 ? `0${month}` : month;

                resolve(`${yearStr}${monthStr}-${1 + count}`);
            });
        });
    }
}
