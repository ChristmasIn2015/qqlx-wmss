import { Injectable } from "@nestjs/common";

import { Order, Book, ENUM_BOOK_TYPE, ENUM_BOOK_DIRECTION, ENUM_ORDER } from "qqlx-core";

import { CorpLock } from "global/lock.corp";
import { AnalysisService } from "src/analysis/service";
import { SkuDao } from "dao/sku";
import { OrderDao } from "dao/order";
import { BookDao, BookOfOrderDao } from "dao/book";

@Injectable()
export class JoinService extends CorpLock {
    constructor(
        private readonly AnalysisService: AnalysisService,
        //
        private readonly SkuDao: SkuDao,
        private readonly OrderDao: OrderDao,
        private readonly BookDao: BookDao,
        private readonly BookOfOrderDao: BookOfOrderDao
    ) {
        super();
    }

    async resetOrderContact(corpId: string, orderId: string) {
        const order: Order = await this.OrderDao.findOne(orderId);
        if (!order) return;

        await Promise.all([
            this.SkuDao.updateMany({ orderId }, { orderContactId: order.contactId }),
            this.BookOfOrderDao.updateMany({ orderId }, { orderContactId: order.contactId }),
            this.OrderDao.updateMany({ corpId, parentOrderId: orderId }, { contactId: order.contactId }),
        ]);
    }

    resetOrderAmount(corpId: string, orderId: string) {
        return new Promise((resolve, reject) => {
            const lock = this.getLock(corpId);
            lock.acquire("amount-book", async () => {
                const updater = {
                    amount: 0,
                    amountBookOfOrder: 0,
                    amountBookOfOrderRest: 0,
                    amountBookOfOrderVAT: 0,
                    amountBookOfOrderVATRest: 0,
                };
                let errorMessage = null;
                try {
                    const order: Order = await this.OrderDao.findOne(orderId);
                    if (!order) return;
                    else if (![ENUM_ORDER.SALES, ENUM_ORDER.PURCHASE].includes(order.type)) return;

                    // SKU
                    const skus = await this.SkuDao.query({ orderId });
                    skus.map((sku) => (updater.amount += (sku.isPriceInPounds ? sku.pounds / 1000 : sku.count) * sku.price));

                    // 资金
                    const match3 =
                        order.type === ENUM_ORDER.SALES
                            ? { orderId, bookType: ENUM_BOOK_TYPE.YSZK, bookDirection: ENUM_BOOK_DIRECTION.DAI }
                            : { orderId, bookType: ENUM_BOOK_TYPE.YFZK, bookDirection: ENUM_BOOK_DIRECTION.JIE };
                    const match4 =
                        order.type === ENUM_ORDER.SALES
                            ? { orderId, bookType: ENUM_BOOK_TYPE.YSZK_VAT, bookDirection: ENUM_BOOK_DIRECTION.JIE }
                            : { orderId, bookType: ENUM_BOOK_TYPE.YFZK_VAT, bookDirection: ENUM_BOOK_DIRECTION.DAI };

                    const aggre34 = await Promise.all([
                        this.BookOfOrderDao.aggregate([{ $match: match3 }, { $group: { _id: "result", total: { $sum: "$amount" } } }]),
                        this.BookOfOrderDao.aggregate([{ $match: match4 }, { $group: { _id: "result", total: { $sum: "$amount" } } }]),
                    ]);

                    const aggre3 = aggre34[0];
                    updater.amountBookOfOrder = aggre3[0]?.total ?? 0;
                    updater.amountBookOfOrderRest = updater.amount - updater.amountBookOfOrder;

                    const aggre4 = aggre34[1];
                    updater.amountBookOfOrderVAT = aggre4[0]?.total ?? 0;
                    updater.amountBookOfOrderVATRest = updater.amount - updater.amountBookOfOrderVAT;

                    // 金额换算
                    updater.amount /= 100;
                    updater.amountBookOfOrder /= 100;
                    updater.amountBookOfOrderRest /= 100;
                    updater.amountBookOfOrderVAT /= 100;
                    updater.amountBookOfOrderVATRest /= 100;
                    await this.OrderDao.updateOne(orderId, updater);

                    // 补充客户分析
                    await this.AnalysisService.updateContactAnalysis(order.corpId, order.contactId, order.type);
                } catch (error) {
                    errorMessage = error.message;
                } finally {
                    errorMessage ? reject(errorMessage) : resolve(updater);
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
                    };

                    // 资金-订单
                    const aggre1 = await this.BookOfOrderDao.aggregate([
                        { $match: { bookId: book._id } },
                        { $group: { _id: "result", total: { $sum: "$amount" } } },
                    ]);
                    updater.amountBookOfOrder = aggre1[0]?.total ?? 0;
                    updater.amountBookOfOrderRest = book.amount - updater.amountBookOfOrder;

                    // 金额换算
                    updater.amountBookOfOrder /= 100;
                    updater.amountBookOfOrderRest /= 100;
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
