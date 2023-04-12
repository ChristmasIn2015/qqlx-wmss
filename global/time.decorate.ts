/** 仅用于查看函数耗时 */
export function TimeLog(message: string) {
    return function (target: Object | Function, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) {
        const original = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const start = Date.now();
            const data = await original.apply(this, args);

            const gap = Date.now() - start;
            console.log(message, gap, "\n");
            return data;
        };

        return descriptor;
    };
}
