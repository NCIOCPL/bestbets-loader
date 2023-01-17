const { AbstractRecordLoader } = require('loader-pipeline');
const path = require('path');
const fsp = require('fs/promises');
const c = require('config');


/**
 * Implements a record loader to create a static file suitable
 * for bulk loading into Elasticsearch via the raw HTTP interface.
 *
 * The order of records in the generated record is nondeterministic,
 * this is due to asynchronous "one record at a time" nature of an
 * AbstractRecordLoader.
 *
 * A sample local.json for invoking this loader vs the default
 * elastic-bestbet-loader appears below.
 *
 * Note: Including the documentType properties will cause the generated
 *       file to include a documentType for each record. These should
 *       only be specified when generating bulk data for ES version 5.
 *
 *      {
 *          "pipeline": {
 *              "loader": {
 *                  "module": "./lib/loaders/file-bestbet-loader",
 *                  "config": {
 *                      "outputFile": "bestbets.json",
 *                      "categoryDisplayDocumentType": "categorydisplay",
 *                      "synonymsDocumentType": "synonyms"
 *                  }
 *              }
 *          }
 *      }
 *
 */
class FileBestBetLoader extends AbstractRecordLoader {

  /**
   * Creates a new instance of FileBestBetLoader
   * @param {*} logger An instance of a logger.
   * @param {*} indexName Name of the index the records will be loaded into.
   * @param {*} outputFile Name of the file to place the records in.
   * @param {*} categoryDisplayDocumentType Optional document type. Only use with Elasticsearch
   *                          versions earlier than 6
   * @param {*} synonymsDocumentType Optional document type. Only use with Elasticsearch
   *                          versions earlier than 6
   */
  constructor(
    logger,
    {
      indexName = null,
      outputFile = null,
      categoryDisplayDocumentType = null,
      synonymsDocumentType = null
    } = {}
  ) {
    super(logger);

    if (!outputFile || typeof outputFile !== 'string') {
      throw new Error('outputFile is required for the FileBestBetLoader');
    }
    this.outputFile = outputFile;

    if (!indexName || typeof indexName !== 'string') {
      throw new Error('indexName is required for the FileBestBetLoader');
    }
    this.indexName = indexName;

    // document types aren't required, but if present, we can generate a bulk
    // data load file for use with Elasticsearch 5.
    if (categoryDisplayDocumentType && typeof categoryDisplayDocumentType === 'string') {
      this.categoryDisplayDocumentType = categoryDisplayDocumentType;
    }
    if (synonymsDocumentType && typeof synonymsDocumentType === 'string') {
      this.synonymsDocumentType = synonymsDocumentType;
    }

    this.outputFileHandle = null;
  }

  /**
   * Called before any records are loaded.
   */
  async begin() {
    this.logger.debug("FileBestBetLoader:begin - Begin Begin");

    this.outputFileHandle = await fsp.open(this.outputFile, 'w+');

    this.logger.debug("FileBestBetLoader:begin - End Begin");
  }

  /**
   * Load a best bet into the bulk loading file.
   * @param {*} matches
   */
  async loadRecord(matches) {

    if (matches.length === 0) {
      throw new Error("A category resulted in 0 matches")
    }

    // The category display will be attached to only the match
    // for the main category, not the synonym matches.
    // So we need to find it
    const categoryDisplay = matches
      .filter(match => match.isCategory)
      .map(cat => ({
        contentid: cat.contentID,
        name: cat.category,
        weight: cat.weight,
        content: cat.categoryDisplay
      }))
      .shift();

    if (!categoryDisplay) {
      throw new Error(`Category ${matches[0].contentID} is missing its display`);
    }

    const catMetadata = { "_index": this.indexName, "_id": categoryDisplay.contentid };
    if (this.categoryDisplayDocumentType && typeof this.categoryDisplayDocumentType === 'string')
      catMetadata["_type"] = this.categoryDisplayDocumentType;

    const catIndex = JSON.stringify({ "index": catMetadata });
    const catBuffer = (catIndex + '\n' + JSON.stringify(categoryDisplay) + '\n');


    // Convert the array of matches into the a bulk index list.
    const synonymArr = matches.reduce((ac, curr, ci) => {

      const synMetadata = { '_index': this.indexName, '_id': `${curr.contentID}_${ci}` };
      if (this.synonymsDocumentType && typeof this.synonymsDocumentType === 'string')
        synMetadata["_type"] = this.synonymsDocumentType;

      const synIndex = {'index': synMetadata};

      const synObject = {
        category: curr.category,
        contentid: curr.contentID,
        synonym: curr.synonym,
        language: curr.language,
        "is_negated": curr.isNegated,
        "is_exact": curr.isExact,
        tokencount: curr.tokenCount
      };

      return [...ac, synIndex , synObject ];
    }, []);


    const synBuffer = synonymArr.reduce(
      (ac, curr) => ac + (JSON.stringify(curr) + '\n'),
      '' // Required to make ac useful on first pass.
    );


    let buffer = (catBuffer + synBuffer);

    await fsp.appendFile(this.outputFileHandle, buffer);
  }

  /**
   * Called upon a fatal loading error. Use this to clean up any items created on startup
   */
  async abort() {
    throw new Error('Not Implemented');
  }

  /**
   * Called after all records are loaded.
   */
  async end() {
    this.logger.debug("FileBestBetLoader:end - Begin End");

    await this.outputFileHandle.close();

    this.logger.debug("FileBestBetLoader:end - End End");
  }

  static ValidateConfig(config) {
    let errors = [];

    // Do something.

    return errors;
  }

  static async GetInstance(logger, config) {

    const appRoot = path.join(__dirname, '..', '..');

    return new FileBestBetLoader(
      logger,
      {
        ...config,
        indexName: config.aliasName,

      }
    )
  }
}

module.exports = FileBestBetLoader;
