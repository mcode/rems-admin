import {
  Bundle,
  BundleEntry,
  Extension,
  FhirResource,
  Library,
  Parameters,
  Questionnaire,
  QuestionnaireItem,
  ValueSet
} from 'fhir/r4';
import container from '../lib/winston';
import config from '../config';
import ValueSetModel from '../lib/schemas/resources/ValueSet';
import QuestionnaireModel from '../lib/schemas/resources/Questionnaire';
import LibraryModel from '../lib/schemas/resources/Library';
import VsacCache from '../lib/vsac_cache';

interface ResourceTable {
  [key: string]: FhirResource;
}
interface ValueSetMap {
  [key: string]: ValueSet;
}
interface LibraryMap {
  [key: string]: Library;
}

const CQF_LIBRARY_EXTENSION = 'http://hl7.org/fhir/StructureDefinition/cqf-library';

export class QuestionnaireUtilities {
  static logger = container.get('application');
  static vsacCache = new VsacCache('./tmp', config.general.VsacApiKey);
  static async createPackageFromQuestionnaire(questionnaire: Questionnaire) {
    questionnaire = await this.processSubQuestionnaires(questionnaire);
    const processedQuestionnaire = await this.processValueSets(questionnaire);
    const bundle: Bundle = { resourceType: 'Bundle', type: 'collection' };
    const entries: BundleEntry[] = [];
    const extensions: Extension[] = processedQuestionnaire.extension || [];
    const fetchedLibraries: LibraryMap = {};
    for (const extension of extensions) {
      if (extension.url === CQF_LIBRARY_EXTENSION) {
        // library to load
        const valueCanonical = extension.valueCanonical;
        if (valueCanonical) {
          // note: libraries have already been checked for duplicates when originally processed
          const library = await this.findLibraryByUrl(valueCanonical);
          if (library && library.id && !fetchedLibraries[library.id]) {
            fetchedLibraries[library.id] = library;
            await this.getAllRelatedLibraries(library, fetchedLibraries);
          }
        }
      }
    }
    for (const key of Object.keys(fetchedLibraries)) {
      const library: Library = fetchedLibraries[key];
      const libraryEntry: BundleEntry = { resource: library };
      entries.push(libraryEntry);
      const valueSets = await this.vsacCache.cacheLibrary(library);
      for (const valueSet of valueSets) {
        const valueSetEntry: BundleEntry = { resource: valueSet };
        entries.push(valueSetEntry);
      }
    }
    const questionnaireEntry: BundleEntry = { resource: processedQuestionnaire };
    entries.push(questionnaireEntry);
    bundle.entry = entries;
    const parameter: Parameters = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'return',
          resource: bundle
        }
      ]
    };
    return parameter;
  }

  // Input object fetchedLibraries modified to contain all related artifacts
  static async getAllRelatedLibraries(library: Library, fetchedLibraries: LibraryMap) {
    if (library.relatedArtifact) {
      for (const artifact of library.relatedArtifact) {
        if (artifact.type === 'depends-on' && artifact.resource) {
          const parts = artifact.resource.split('/');
          const resourceType = parts[0];
          const artifactId = parts[1];
          if (resourceType === 'Library' && artifactId) {
            if (!fetchedLibraries[artifactId]) {
              const fetchedLibrary = await this.findLibraryById(artifactId);
              if (fetchedLibrary) {
                fetchedLibraries[artifactId] = fetchedLibrary;
                this.getAllRelatedLibraries(fetchedLibrary, fetchedLibraries); // recurse
              }
            }
          }
        }
      }
    }
  }
  // On load of new library, finds ValueSets in code filters and
  // loads them as well
  static async processLibraryCodeFilters(library: Library) {
    const returnValue = this.vsacCache.cacheLibrary(library);
    return returnValue;
  }

  static async findQuestionnaireByUrl(url: string): Promise<Questionnaire | null | undefined> {
    return await QuestionnaireModel.findOne({ url: url.toString() });
  }
  static async findLibraryByUrl(url: string): Promise<Library | null | undefined> {
    return await LibraryModel.findOne({ url: url.toString() });
  }
  static async findLibraryById(id: string): Promise<Library | null | undefined> {
    return await LibraryModel.findOne({ id: id.toString() });
  }
  static async findValueSetByUrl(url: string): Promise<ValueSet | null | undefined> {
    return await ValueSetModel.findOne({ url: url.toString() });
  }
  static async processSubQuestionnaires(questionnaire: Questionnaire) {
    const extensions = questionnaire.extension || [];
    const contained = questionnaire.contained || [];
    const containedList: ResourceTable = {};
    contained.forEach(item => {
      if (item.id) {
        containedList[item.id] = item;
      }
    });
    const containedSize = Object.keys(containedList).length;
    const items = questionnaire.item || [];
    await this.processItemList(items, extensions, containedList);
    questionnaire.item = items;
    const containedValues = Object.values(containedList);
    if (containedSize !== containedValues.length) {
      questionnaire.contained = containedValues;
    }
    return questionnaire;
  }
  static async processItemList(
    items: QuestionnaireItem[],
    extensions: Extension[],
    containedList: ResourceTable
  ) {
    if (items.length === 0) {
      return;
    }
    for (let i = 0; i < items.length; ) {
      const subItems = await this.processItem(items[i], extensions, containedList);
      let increment = 0;
      if (subItems !== undefined && subItems.length !== 0) {
        if (subItems.length === 1) {
          items[i] = subItems[0];
        } else {
          items.splice(i, 1);
          subItems.forEach((e, j) => {
            items.splice(i + j, 0, e); //replace old item with new expanded version
          });
        }
        increment = subItems.length;
      }
      i = i + increment;
    }
  }
  static async processItem(
    item: QuestionnaireItem,
    extensions: Extension[],
    containedList: ResourceTable
  ) {
    const ext = this.getExtension(
      item,
      'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-subQuestionnaire'
    );
    if (ext) {
      const subQ = ext.valueCanonical;
      console.log(subQ);
      if (subQ) {
        // not undefined
        let expandRootItem = false;
        const expandExt = this.getExtension(
          item,
          'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible'
        );
        if (expandExt && expandExt.valueBoolean) {
          expandRootItem = expandExt.valueCode === 'default-open';
        }
        const subQuestionnaire = await this.findQuestionnaireByUrl(subQ);
        if (subQuestionnaire) {
          const subExtensions = subQuestionnaire.extension || [];
          subExtensions.forEach(ext => {
            const matches = extensions.filter(ext2 => {
              return ext2.valueCanonical === ext.valueCanonical;
            });
            if (matches.length === 0) {
              // no matches, merge extension
              extensions[extensions.length] = ext;
            }
          });
          subQuestionnaire.contained?.forEach(containedItem => {
            if (containedItem.id) {
              containedList[containedItem.id] = containedItem;
            }
          });
          const rootItems = subQuestionnaire.item || [];
          if (!expandRootItem || rootItems.length > 1) {
            return rootItems;
          } else {
            return rootItems[0].item;
          }
        } else {
          return [item];
        }
      } else {
        return [item];
      }
    }
    if (item.item) {
      await this.processItemList(item.item, extensions, containedList);
    }
    return [item];
  }

  static getExtension(item: QuestionnaireItem, url: string) {
    return item.extension?.find(ext => {
      return ext.url === url;
    });
  }
  static async processValueSets(questionnaire: Questionnaire) {
    const valueSetMap: ValueSetMap = {};
    if (questionnaire.item) {
      await this.findAndReplaceValueSetReferences(questionnaire.item, valueSetMap);
    }
    const keys = Object.keys(valueSetMap);
    if (keys.length > 0) {
      if (questionnaire.contained === undefined) {
        questionnaire.contained = [];
      }
      keys.forEach(key => {
        const valueSet = valueSetMap[key];
        questionnaire.contained?.push(valueSet);
      });
    }
    return questionnaire;
  }
  static async findAndReplaceValueSetReferences(
    items: QuestionnaireItem[],
    valueSetMap: ValueSetMap
  ) {
    for (const itemComponent of items) {
      if (itemComponent.answerValueSet !== undefined) {
        if (!itemComponent.answerValueSet.startsWith('#')) {
          const valueSetId = await this.findAndLoadValueSet(
            itemComponent.answerValueSet,
            valueSetMap
          );
          if (valueSetId) {
            itemComponent.answerValueSet = `#${valueSetId}`;
          } else {
            this.logger.warn(`Referenced ValueSet: ${itemComponent.answerValueSet} was not found`);
          }
        }
      }
      if (itemComponent.item) {
        await this.findAndReplaceValueSetReferences(itemComponent.item, valueSetMap);
      }
    }
  }

  static async findAndLoadValueSet(url: string, valueSetMap: ValueSetMap) {
    if (url in Object.keys(valueSetMap)) {
      return valueSetMap[url].id;
    }
    const valueSet = await this.findValueSetByUrl(url);
    if (valueSet) {
      valueSet.url = `#${valueSet.id}`;
      console.log(`findAndLoadValueSet: ${valueSet?.id}`);

      valueSetMap[url] = valueSet;
      return valueSet.id;
    } else {
      return undefined;
    }
  }
}
