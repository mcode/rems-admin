import { Resource } from 'fhir/r4';

interface Source {
  label: string;
  url: URL;
  icon?: URL;
}
interface Action {
  type: string;
  description: string;
  resource?: Resource | string;
}
interface Suggestion {
  label: string;
  uuid?: string;
  actions: Action[];
}
export interface Link {
  label: string;
  url: URL;
  type: linkType;
  appContext?: string;
}
type linkType = 'absolute' | 'smart';
type indicatorType = 'info' | 'warning' | 'critical';
export default class Card {
  summary: string;
  detail?: string;
  indicator: indicatorType;
  source: Source;
  suggestions?: Suggestion[];
  selectionBehavior?: string;
  links?: Link[];

  constructor(summary: string, detail: string, source: Source, indicator: indicatorType = 'info') {
    this.summary = summary;
    this.detail = detail;
    this.source = source;
    this.indicator = indicator;
  }

  get card() {
    return this;
  }
  addSuggestions(suggestions: Suggestion[]) {
    if (this.suggestions) {
      this.suggestions = this.suggestions.concat(suggestions);
    } else {
      this.suggestions = suggestions;
    }
  }
  addSuggestion(suggestion: Suggestion) {
    if (this.suggestions) {
      this.suggestions?.push(suggestion);
    } else {
      this.suggestions = [suggestion];
    }
  }
  addLinks(links: Link[]) {
    if (this.links) {
      this.links = this.links.concat(links);
    } else {
      this.links = links;
    }
  }
  addLink(link: Link) {
    if (this.links) {
      this.links?.push(link);
    } else {
      this.links = [link];
    }
  }
  generateCard() {
    return this;
  }
}
