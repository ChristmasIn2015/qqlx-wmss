import { Injectable } from "@nestjs/common";

import { Order, Book } from "qqlx-core";

import { CorpLock } from "global/lock.corp";
import { SkuDao } from "dao/sku";
import { OrderDao } from "dao/order";
import { BookDao, BookOfOrderDao, BookOfSelfDao } from "dao/book";

@Injectable()
export class JoinService extends CorpLock {
    constructor(
        private readonly SkuDao: SkuDao,
        private readonly OrderDao: OrderDao,
        private readonly BookDao: BookDao,
        private readonly BookOfOrderDao: BookOfOrderDao,
        private readonly BookOfSelfDao: BookOfSelfDao
    ) {
        super();
    }

    async resetOrderContact(corpId: string, orderId: string) {
        const order: Order = await this.OrderDao.findOne(orderId);
        if (!order) return;

        await this.SkuDao.updateMany({ orderId }, { orderContactId: order.contactId });
        await this.BookOfOrderDao.updateMany({ orderId }, { orderContactId: order.contactId });
        await this.OrderDao.updateMany({ corpId, parentOrderId: orderId }, { contactId: order.contactId });
    }

    resetAmountOrder(corpId: string, orderId: string) {
        return new Promise((resolve, reject) => {
            const lock = this.getLock(corpId);
            lock.acquire("amount-book", async () => {
                let errorMessage = null;
                try {
                    const order: Order = await this.OrderDao.findOne(orderId);
                    if (!order) return;

                    const updater = {
                        amount: 0,
                        amountBookOfOrder: 0,
                        amountBookOfOrderRest: 0,
                    };

                    // SKU
                    const skus = await this.SkuDao.query({ orderId });
                    skus.map((sku) => (updater.amount += (sku.isPriceInPounds ? sku.pounds / 1000 : sku.count) * sku.price));

                    // BOOK
                    const aggre3 = await this.BookOfOrderDao.aggregate([
                        //
                        { $match: { orderId } },
                        { $group: { _id: "result", total: { $sum: "$amount" } } },
                    ]);
                    updater.amountBookOfOrder = aggre3[0]?.total ?? 0;
                    updater.amountBookOfOrderRest = updater.amount - updater.amountBookOfOrder;

                    // 金额换算
                    updater.amount /= 100;
                    updater.amountBookOfOrder /= 100;
                    updater.amountBookOfOrderRest /= 100;
                    await this.OrderDao.updateOne(orderId, updater);
                } catch (error) {
                    errorMessage = error.message;
                } finally {
                    errorMessage ? reject(errorMessage) : resolve(true);
                }
            });
        });
    }

    resetAmountBook(corpId: string, bookId: string) {
        return new Promise((resolve, reject) => {
            const lock = this.getLock(corpId);
            lock.acquire("amount-book", async () => {
                let errorMessage = null;
                try {
                    const book: Book = await this.BookDao.findOne(bookId);
                    if (!book) return;

                    const updater = {
                        amountBookOfOrder: book.amountBookOfOrder,
                        amountBookOfOrderRest: book.amountBookOfOrderRest,
                        amountBookOfSelf: book.amountBookOfSelf,
                        amountBookOfSelfRest: book.amountBookOfSelfRest,
                    };

                    // 资金-订单
                    const aggre1 = await this.BookOfOrderDao.aggregate([
                        { $match: { bookId: book._id } },
                        { $group: { _id: "result", total: { $sum: "$amount" } } },
                    ]);
                    updater.amountBookOfOrder = aggre1[0]?.total ?? 0;
                    updater.amountBookOfOrderRest = book.amount - updater.amountBookOfOrder;

                    // 资金-订单-发票
                    const aggre2 = await this.BookOfSelfDao.aggregate([
                        { $match: { $or: [{ invoiceId: book._id }, { bookId: book._id }] } },
                        { $group: { _id: "result", total: { $sum: "$amount" } } },
                    ]);
                    updater.amountBookOfSelf = aggre2[0]?.total ?? 0;
                    updater.amountBookOfSelfRest = book.amount - updater.amountBookOfSelf;

                    // 金额换算
                    updater.amountBookOfOrder /= 100;
                    updater.amountBookOfOrderRest /= 100;
                    updater.amountBookOfSelf /= 100;
                    updater.amountBookOfSelfRest /= 100;
                    await this.BookDao.updateOne(book._id, updater);
                } catch (error) {
                    errorMessage = error.message;
                } finally {
                    errorMessage ? reject(errorMessage) : resolve(true);
                }
            });
        });
    }
}
