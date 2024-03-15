const { AbstractRecordSource }      = require('loader-pipeline');
const entities                      = require('html-entities')
const fs                            = require('fs/promises');
const path                          = require('path');
const util                          = require('util');
const { parseString }               = require('xml2js');

const parseStringAsync              = util.promisify(parseString);

/**
 * This class implements a Bestbets Source wherin the content lives in the
 * bestbets-content structure of Github.
 */
class FileSystemBestbetsSource extends AbstractRecordSource {

  /**
   * Creates a new instance of a FileSystemBestbetsSource
   * @param {logger} logger An instance of a logger.
   * @param {Object} param2 A configuration object
   * @param {string} param2.contentPath The path within the filesystem to the resources. (DEFAULT: /content)
   */
  constructor(logger, {
    contentPath = '/content'
  } = {}) {
    super(logger);

    if (!contentPath || typeof contentPath !== 'string' || contentPath.trim().length === 0) {
      throw new Error('You must supply a file system path.');
    }


    this.contentPath = contentPath.trim();
  }

  /**
   * Called before any resources are loaded.
   */
  async begin() {
    return;
  }

  /**
   * Get a collection of records from this source
   */
  async getRecords() {

    this.logger.debug("FileSystemBestbetsSource:getRecords - Beginning Fetch");

    let contentList;
    //Get list of content from github
    try {
      contentList = await this.getContentList();
    } catch (err) {
      this.logger.error(`Could not fetch resources from '${this.contentPath}.'`);
      throw err;
    }

    let categories;
    //download to the content and map it
    try {
      categories = await Promise.all(
        contentList.map(async(contentUrl) => {
          const content = await this.getContent(contentUrl);
          return await this.mapContentToCat(content)
        })
      )
    } catch (err) {
      this.logger.error(`Could not fetch individual resources from '${this.contentPath}.'`);
      throw err;
    }

    this.logger.debug("FileSystemBestbetsSource:getResources - Completed Fetch");

    return categories;
  }

  /**
   * Internal function to get the list of content items in the content folder
   * @return {array} an array of the files to retrieve.
   */
  async getContentList() {

    const regEx = /.*\.xml$/;

    const candidates = await fs.readdir( this.contentPath, { withFileTypes: true} );

    const bestBetList = candidates
      .filter(c => c.isFile() && regEx.test(c.name))
      .map(c => path.join(this.contentPath, c.name));

    return bestBetList;
  }

  /**
   * Reads a best bet file and converts it to a category.
   * @param {*} filePath The file path to retrieve.
   * @returns {Object} the resource
   */
  async getContent(filePath) {

    let response;

    try {
      response = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      this.logger.error(`Could not fetch ${filePath}`);
      throw new Error(`Could not fetch ${filePath}`);
    }

    return response;
  }

  /**
   * Gets a category object from an XML content file.
   *
   * @param {*} content
   */
  async mapContentToCat(content) {
    let cat;
    try {
      cat = await parseStringAsync(content);
    } catch(err) {
      throw new Error('Cannot process XML')
    }

    const root = 'cde:BestBetsCategory';

    if (!cat[root]) {
        throw new Error(`Invalid BestBets Category, ${contentUrl}`);
    }

    const cleanCat = {
        categoryID: this.cleanToString(cat[root].CategoryId),
        categoryName: this.cleanToString(cat[root].CategoryName),
        categoryWeight: this.cleanToInt(cat[root].CategoryWeight),
        isExactMatch: this.cleanToBool(cat[root].IsExactMatch),
        language: this.getLang(this.cleanToString(cat[root].Language)),
        display: this.cleanToBool(cat[root].Display),
        includeSynonyms: this.extractSynonyms(cat[root].IncludeSynonyms),
        excludeSynonyms: this.extractSynonyms(cat[root].ExcludeSynonyms),
        categoryDisplay: this.getDisplay(cat[root].CategoryDisplay),
    }

    if (cleanCat.language === "") {
        throw new Error(`Invalid BestBets Category, ${catListing.FullWebPath}, language is empty or unknown`);
    }

    return cleanCat;
  }

  /**
   * Gets out the category display, or an empty string.
   *
   * @param {*} content the content to extract
   */
  getDisplay(content) {
    if (!content) {
      return "";
    }

    return Array.isArray(content) ?
      (
        content.length ?
        content[0].trim() :
        ""
      ) :
      content.trim();
  }

  /**
   * Validates the lang and gets a clean ISO 639-1 code if
   * it is a valid language/local.
   * (You will encounter multiple versions in the XML)
   * @param {*} cleanedLang
   */
  getLang(cleanedLang) {
    if (!cleanedLang || cleanedLang === '') {
      return "";
    }

    switch (cleanedLang.toLowerCase()) {
      case 'en':
      case 'eng':
      case 'en-us':
        return 'en';

      case 'es':
      case 'esp':
      case 'es-us':
        return 'es';
      default:
        return "";
    }
  }

  /**
   * Extracts a list of Synonyms from a Synonym node
   * @param {*} synElement THe element containing the synonyms
   */
  extractSynonyms(synElement) {
    if (synElement &&
      synElement.length &&
      synElement[0].synonym &&
      synElement[0].synonym.length
    ) {
      return synElement[0].synonym.map(syn => ({
        name: this.cleanToString(syn["_"]),
        isExactMatch: this.cleanToBool(syn['$']["IsExactMatch"])
      }))
    } else {
      return [];
    }
  }

  /**
   * This cleans up and converts a string to a boolean
   * @param {*} val
   */
  cleanToBool(val) {
    //The XML files always use 'true' for true.
    //(well, when they don't have newlines preceeding them...)
    return this.cleanToString(val) === 'true';
  }

  /**
   * This cleans up and converts a string to a boolean
   * @param {*} val
   */
  cleanToInt(val) {
    return parseInt(this.cleanToString(val));
  }

  /**
   * This cleans up and converts a string to a boolean
   * @param {*} val
   */
  cleanToString(val) {
    if (!val) {
      return "";
    }

    return Array.isArray(val) ?
      (
        val.length ?
        entities.decode(val[0].trim()) :
        ""
      ) :
      entities.decode(val.trim());
  }

  /**
   * Method called after all resources have been loaded
   */
  async end() {
    return;
  }

  /**
   * Called upon a fatal loading error. Use this to clean up any items created on startup
   */
  async abort() {
    return;
  }

  /**
   * A static method to validate a configuration object against this module type's schema
   * @param {Object} config configuration parameters to use for this instance.
   * @param {string} config.contentPath The path within the repo to the resources. (DEFAULT: /resources)
   */
  static ValidateConfig(config) {
    let errors = [];

    if (!config.contentPath) {
      errors.push(new Error("You must supply a file system path."));
    }

    return errors;
  }

  /**
   * A static helper function to get a configured source instance
   * @param {Object} logger the logger to use
   * @param {Object} config configuration parameters to use for this instance. See FileSystemBestbetsSource constructor.
   */
  static async GetInstance(logger, config) {

    if (!config) {
      throw new Error("Config must be supplied");
    }

    // We will probably need to authenticate to get around the rate limits
    // they are based on IP address, which for us *could* be a major limiter.
    if(config['authentication'] != null ){
      options.auth = config['authentication'].token;
    }

    return new FileSystemBestbetsSource(logger, config);
  }
}

module.exports = FileSystemBestbetsSource;
