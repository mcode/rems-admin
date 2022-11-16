import ServicePrefetch from "./Prefetch/ServicePrefetch";

export default interface Hook{
    id:string
    hook: string
    name: string
    description: string
    prefetch: ServicePrefetch
}