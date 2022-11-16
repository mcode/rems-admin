import Hook from "./Hook";
import OrderSignPrefetch from "./Prefetch/OrderSignPrefetch";

export default class OrderSign implements Hook{
    id:string
    hook: string
    name: string
    description: string
    prefetch: OrderSignPrefetch
    constructor(id:string, hook:string, name:string, description: string, prefetch: OrderSignPrefetch){
        this.id = id
        this.hook = hook
        this.name = name
        this.description = description
        this.prefetch = prefetch
    }
}