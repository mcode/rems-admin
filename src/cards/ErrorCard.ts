import Card from "./Card"
export default class ErrorCard extends Card{
    constructor(summary:string, detail:string, label:string, url:string, indicator:string = "error"){
        super(summary, detail, label, url, indicator)
    }
}