
export abstract class Database{
    public location: string 
    public database: any
    public client: any

    constructor(public config: any) {
        this.location = config.location;
        return this;
    }

    abstract connect(): any
}
