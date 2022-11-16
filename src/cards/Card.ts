export default class Card {

    summary: string
    detail: string
    sourceLabel: string
    sourceUrl: string
    indicator: string

    constructor(summary: string, detail: string, sourceLabel: string, sourceUrl: string, indicator: string = "info") {
        this.summary = summary
        this.detail = detail
        this.sourceLabel = sourceLabel
        this.sourceUrl = sourceUrl
        this.indicator = indicator
    }

    get card(){
        return this.generateCard()
    }

    generateCard(){
        return {
                summary: this.summary,
                detail: this.detail,
                source: {
                  label: this.sourceLabel,
                  url: this.sourceUrl
                },
                indicator: this.indicator
              }
    }
}