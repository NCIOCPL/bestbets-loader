const ElasticBestbetsLoader             = require('../elastic-bestbets-loader');
const elasticsearch                     = require('@elastic/elasticsearch');
const nock                              = require('nock');
const path                              = require('path');
const winston                           = require('winston');
const WinstonNullTransport              = require('winston-null-transport');
const ElasticTools                      = require('elastic-tools')


const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.simple(),
    transports: [
        new WinstonNullTransport()
    ]
});

beforeAll(() => {
    nock.disableNetConnect();
})

beforeEach(() => {
    //ElasticTools.mockClear();
})

//After each test, cleanup any remaining mocks
afterEach(() => {
    nock.cleanAll();
});

afterAll(() => {
    nock.enableNetConnect();
})

const GOOD_CON_CONFIG = {
    "daysToKeep": 10,
    "minIndexesToKeep": 7,
    "aliasName": "bestbets_v1"
}

const GOOD_STEP_CONFIG = {
    "eshosts": [ "http://localhost:9200/" ],
    "daysToKeep": 10,
    "minIndexesToKeep": 5,
    "aliasName": "bestbets_v1",
    "mappingPath": "es-mappings/mappings.json",
    "settingsPath": "es-mappings/settings.json"
}

/*
const elasticClient = new elasticsearch.Client({
    hosts: ['http://example.org:9200'],
    apiVersion: '5.6',
    maxSockets: 100,
    keepAlive: true
});
*/

// Constant values for constructor tests.
const estools = new ElasticTools(logger, new elasticsearch.Client({
  nodes: ['http://example.org:9200'],
  maxSockets: 100,
  keepAlive: true
}));

const mappings = { mappings: { properties: {} } };
const settings = { settings: { index: {} } };



describe('ElasticBestbetsLoader', () => {
    describe('constructor', () => {

      it('works with all required arguments', async () => {

        const actual = new ElasticBestbetsLoader(
          logger,
          estools,
          mappings,
          settings,
          {
            aliasName: 'testAlias'
          }
        );

        expect(actual).not.toBeNull();
        expect(actual.aliasName).toBe('testAlias');
      });

      it('has default settings', async () => {

        const actual = new ElasticBestbetsLoader(
          logger,
          estools,
          mappings,
          settings,
          {
            aliasName: 'testAlias'
          }
        );

        expect(actual.daysToKeep).toBe(10);
        expect(actual.minIndexesToKeep).toBe(2);
      });

      it('alows defaults to be overridden', async () => {

        const actual = new ElasticBestbetsLoader(
          logger,
          estools,
          mappings,
          settings,
          {
            ...GOOD_CON_CONFIG
          }
        );

        expect(actual.daysToKeep).toBe(GOOD_CON_CONFIG.daysToKeep);
        expect(actual.minIndexesToKeep).toBe(GOOD_CON_CONFIG.minIndexesToKeep);
        expect(actual.aliasName).toBe(GOOD_CON_CONFIG.aliasName);
      });

      it.each([
        [
          'throws error on no aliasName',
          {
            ...GOOD_CON_CONFIG,
            aliasName: undefined
          },
          'aliasName is required for the elastic loader'
        ],
        [
          'throws error on invalid aliasName',
          {
            ...GOOD_CON_CONFIG,
            aliasName: true
          },
          'aliasName is required for the elastic loader'
        ],
        [
          'throws error on invalid daysToKeep',
          {
            ...GOOD_CON_CONFIG,
            daysToKeep: 'chicken'
          },
          "daysToKeep is required for the elastic loader"
        ],
        [
          'throws error on invalid minIndexesToKeep',
          {
            ...GOOD_CON_CONFIG,
            minIndexesToKeep: 'chicken'
          },
          "minIndexesToKeep is required for the elastic loader"
        ],
      ])(
        '$s',
        (name, config, expectedMesssage) => {
          expect(() => {
            new ElasticBestbetsLoader(
              logger,
              estools,
              mappings,
              settings,
              {
                ...config
              }
            )
          }).toThrow(expectedMesssage);
        }
      )

    });

    describe('begin', () => {

      it('creates an index', async () => {

        const expectedIndex = `${GOOD_STEP_CONFIG.aliasName}-index`;

        const mockEStools = {
          createTimestampedIndex: jest.fn((aliasName, mappings, settings) => `${aliasName}-index`)
        }

        const loader = new ElasticBestbetsLoader(
          logger,
          mockEStools,
          mappings,
          settings,
          GOOD_STEP_CONFIG
        );
        await loader.begin();

        expect(loader.indexName).toBe(expectedIndex);
        expect(mockEStools.createTimestampedIndex.mock.calls.length).toBe(1);
        expect(mockEStools.createTimestampedIndex.mock.calls[0][0]).toBe(GOOD_STEP_CONFIG.aliasName);
        expect(mockEStools.createTimestampedIndex.mock.calls[0][1]).toBe(mappings);
        expect(mockEStools.createTimestampedIndex.mock.calls[0][2]).toBe(settings);
      });

    })

    describe('end', () => {

      it('updates the indices', async () => {

        const testIndexName = 'testIndex';

        const mockEStools = {
          cleanupOldIndices: jest.fn((aliasName, daysToKeep, minIndexesToKeep) => null),
          createTimestampedIndex: jest.fn((aliasName, mappings, settings) => testIndexName),
          optimizeIndex: jest.fn(indexName => null),
          setAliasToSingleIndex: jest.fn((aliasName, indexName) => null)
        }

        const loader = new ElasticBestbetsLoader(
          logger,
          mockEStools,
          mappings,
          settings,
          GOOD_STEP_CONFIG
        );

        // Need to call begin in order to set an index name for end to use.
        await loader.begin();
        await loader.end();

        expect(mockEStools.optimizeIndex.mock.calls.length).toBe(1);
        expect(mockEStools.optimizeIndex.mock.calls[0][0]).toBe(testIndexName);

        expect(mockEStools.setAliasToSingleIndex.mock.calls.length).toBe(1);
        expect(mockEStools.setAliasToSingleIndex.mock.calls[0][0]).toBe(GOOD_STEP_CONFIG.aliasName);
        expect(mockEStools.setAliasToSingleIndex.mock.calls[0][1]).toBe(testIndexName);

        expect(mockEStools.cleanupOldIndices.mock.calls.length).toBe(1);
        expect(mockEStools.cleanupOldIndices.mock.calls[0][0]).toBe(GOOD_STEP_CONFIG.aliasName);
        expect(mockEStools.cleanupOldIndices.mock.calls[0][1]).toBe(GOOD_STEP_CONFIG.daysToKeep);
        expect(mockEStools.cleanupOldIndices.mock.calls[0][2]).toBe(GOOD_STEP_CONFIG.minIndexesToKeep);

      });

    })

    describe('loadRecord', () => {

        it('indexes the document', async () => {

            const testIndexName = `${GOOD_STEP_CONFIG.aliasName}-testIndex`

            const mockEStools = {
                indexDocumentBulk: jest.fn((indexName, docArr) => ({updated:[], errors:false}) ),
                indexDocument: jest.fn((indexName, contentID, categoryDisplay) => ({result: "created"}) ),
                createTimestampedIndex: jest.fn((aliasName, mappings, settings) => testIndexName)
            }

            const bestBetRecords = [
              {
                isCategory: true,
                category: "Cancer Research Ideas",
                weight: 100,
                contentID: 1045389,
                synonym: "Cancer Research Ideas",
                language: "en",
                isNegated: false,
                isExact: false,
                tokenCount: 3,
                categoryDisplay: "<div class=\"managed list\">\n<ul>\n<li class=\"general-list-item general list-item\">\n<!-- cgvSnListItemGeneral -->\n<!-- Image -->\n<!-- End Image -->\n<div class=\"title-and-desc title desc container\"><a class=\"title\" href=\"https://cancerresearchideas.cancer.gov\">Cancer Research Ideas</a><!-- start description -->\n<div class=\"description\"><p class=\"body\">An online platform for cancer researchers to submit their best scientific ideas for bringing about a decade’s worth of advances in 5 years, making more therapies available to more patients, and spurring progress in cancer prevention, treatment, and care. </p></div><!-- end description --></div><!-- end title & desc container -->\n</li></ul>\n</div>",
                record_type: 'categoryDisplay'
              },
              {
                isCategory: false,
                category: "Cancer Research Ideas",
                weight: 100,
                contentID: 1045389,
                synonym: "Clinical Trial Ideas",
                language: "en",
                isNegated: false,
                isExact: false,
                tokenCount: 0,
                record_type: 'synonym'
              }
            ];

            const loader = new ElasticBestbetsLoader(
                logger,
                mockEStools,
                mappings,
                settings,
                GOOD_STEP_CONFIG
            );

            // Need to call begin in order to set an index name for loadRecord to use.
            await loader.begin();
            await loader.loadRecord(bestBetRecords);

            expect(mockEStools.indexDocumentBulk.mock.calls.length).toBe(1);
            expect(mockEStools.indexDocument.mock.calls.length).toBe(1);
        });

        it('reports indexing errors', async () => {

            const expectedMesssage = 'Category 1045389 had document errors';

            const testIndexName = `${GOOD_STEP_CONFIG.aliasName}-testIndex`
            const mockEStools = {
                indexDocumentBulk: jest.fn((indexName, docArr) => ({updated:[], errors:[{id: '1056403_0', error: {type: 'mapper_parsing_exception'}}]}) ),
                indexDocument: jest.fn((indexName, contentID, categoryDisplay) => ({result: "created"}) ),
                createTimestampedIndex: jest.fn((aliasName, mappings, settings) => testIndexName)
            }

            const bestBetRecords = [
              {
                isCategory: true,
                category: "Cancer Research Ideas",
                weight: 100,
                contentID: 1045389,
                synonym: "Cancer Research Ideas",
                language: "en",
                isNegated: false,
                isExact: false,
                tokenCount: 3,
                categoryDisplay: "<div class=\"managed list\">\n<ul>\n<li class=\"general-list-item general list-item\">\n<!-- cgvSnListItemGeneral -->\n<!-- Image -->\n<!-- End Image -->\n<div class=\"title-and-desc title desc container\"><a class=\"title\" href=\"https://cancerresearchideas.cancer.gov\">Cancer Research Ideas</a><!-- start description -->\n<div class=\"description\"><p class=\"body\">An online platform for cancer researchers to submit their best scientific ideas for bringing about a decade’s worth of advances in 5 years, making more therapies available to more patients, and spurring progress in cancer prevention, treatment, and care. </p></div><!-- end description --></div><!-- end title & desc container -->\n</li></ul>\n</div>",
                record_type: 'categoryDisplay'
              },
              {
                isCategory: false,
                category: "Cancer Research Ideas",
                weight: 100,
                contentID: 1045389,
                synonym: "Clinical Trial Ideas",
                language: "en",
                isNegated: false,
                isExact: false,
                tokenCount: 0,
                record_type: 'synonym'
              }
            ];

            const loader = new ElasticBestbetsLoader(
                logger,
                mockEStools,
                mappings,
                settings,
                GOOD_STEP_CONFIG
            );

            // Need to call begin in order to set an index name for loadRecord to use.
            await loader.begin();

            let err;
            try {
              await loader.loadRecord(bestBetRecords);
            } catch (error) {
              err = error;
            }

            expect(err.message).toBe(expectedMesssage);

        });

        it('reports indexing duplciate synonyms', async () => {

            const expectedMesssage = 'Category 1045389 appears to have duplicates';

            const testIndexName = `${GOOD_STEP_CONFIG.aliasName}-testIndex`
            const mockEStools = {
                indexDocumentBulk: jest.fn((indexName, docArr) => ({ updated: ['1045389_0'], errors:[]}) ),
                indexDocument: jest.fn((indexName, contentID, categoryDisplay) => ({result: "created"}) ),
                createTimestampedIndex: jest.fn((aliasName, mappings, settings) => testIndexName)
            }

            const bestBetRecords = [
              {
                isCategory: true,
                category: "Cancer Research Ideas",
                weight: 100,
                contentID: 1045389,
                synonym: "Cancer Research Ideas",
                language: "en",
                isNegated: false,
                isExact: false,
                tokenCount: 3,
                categoryDisplay: "<div class=\"managed list\">\n<ul>\n<li class=\"general-list-item general list-item\">\n<!-- cgvSnListItemGeneral -->\n<!-- Image -->\n<!-- End Image -->\n<div class=\"title-and-desc title desc container\"><a class=\"title\" href=\"https://cancerresearchideas.cancer.gov\">Cancer Research Ideas</a><!-- start description -->\n<div class=\"description\"><p class=\"body\">An online platform for cancer researchers to submit their best scientific ideas for bringing about a decade’s worth of advances in 5 years, making more therapies available to more patients, and spurring progress in cancer prevention, treatment, and care. </p></div><!-- end description --></div><!-- end title & desc container -->\n</li></ul>\n</div>",
                record_type: 'categoryDisplay'
              },
              {
                isCategory: false,
                category: "Cancer Research Ideas",
                weight: 100,
                contentID: 1045389,
                synonym: "Clinical Trial Ideas",
                language: "en",
                isNegated: false,
                isExact: false,
                tokenCount: 0,
                record_type: 'synonym'
              }
            ];

            const loader = new ElasticBestbetsLoader(
                logger,
                mockEStools,
                mappings,
                settings,
                GOOD_STEP_CONFIG
            );

            // Need to call begin in order to set an index name for loadRecord to use.
            await loader.begin();

            let err;
            try {
              await loader.loadRecord(bestBetRecords);
            } catch (error) {
              err = error;
            }

            expect(err.message).toBe(expectedMesssage);

        });

        it('errors on no matches', async () => {
            const expectedMesssage = 'A category resulted in 0 matches';

            const testIndexName = `${GOOD_STEP_CONFIG.aliasName}-testIndex`
            const mockEStools = {
                indexDocumentBulk: jest.fn((indexName, docArr) => ({ updated: ['1045389_0'], errors:[]}) ),
                indexDocument: jest.fn((indexName, contentID, categoryDisplay) => ({result: "created"}) ),
                createTimestampedIndex: jest.fn((aliasName, mappings, settings) => testIndexName)
            }

            const bestBetRecords = [];

            const loader = new ElasticBestbetsLoader(
                logger,
                mockEStools,
                mappings,
                settings,
                GOOD_STEP_CONFIG
            );

            // Need to call begin in order to set an index name for loadRecord to use.
            await loader.begin();

            let err;
            try {
              await loader.loadRecord(bestBetRecords);
            } catch (error) {
              err = error;
            }

        });
    })


    describe('ValidateConfig', () => {

        it.each([
            ['has no errors', GOOD_STEP_CONFIG, []],
            [
                'has error on no es hosts',
                {
                    ...GOOD_STEP_CONFIG,
                    eshosts: undefined
                },
                [
                    new Error("eshosts is required for the elastic loader")
                ]
            ],
            [
                'has error on no settings',
                {
                    ...GOOD_STEP_CONFIG,
                    settingsPath: undefined
                },
                [
                    new Error("settingsPath is required for the elastic loader")
                ]
            ],
            [
                'has error on no mappings',
                {
                    ...GOOD_STEP_CONFIG,
                    mappingPath: undefined
                },
                [
                    new Error("mappingPath is required for the elastic loader")
                ]
            ]
        ])(
            '%s',
            (name, config, expected) => {
                const actual = ElasticBestbetsLoader.ValidateConfig(config);
                expect(actual).toEqual(expected);
            }
        )
    })

    describe('GetInstance', () => {
        it('works', async () => {
            const actual = await ElasticBestbetsLoader.GetInstance(logger, {
              ...GOOD_STEP_CONFIG,
              minIndexesToKeep: undefined // force default
            });
            expect(actual.aliasName).toEqual(GOOD_CON_CONFIG.aliasName);
            expect(actual.daysToKeep).toEqual(GOOD_CON_CONFIG.daysToKeep);
            expect(actual.minIndexesToKeep).toEqual(2);
            //TODO: This will break if estools is mocked.
            expect(actual.estools.client.transport.connectionPool.connections).toHaveLength(GOOD_STEP_CONFIG.eshosts.length);
            let actualHosts = actual.estools.client.transport.connectionPool.connections.map(conn => conn.url.href);
            expect(actualHosts).toEqual(expect.arrayContaining(GOOD_STEP_CONFIG.eshosts));
            //TODO: Test socketLimit
        })

        it('works with socketLimit', async () => {
            const actual = await ElasticBestbetsLoader.GetInstance(
                logger,
                {
                    ...GOOD_STEP_CONFIG,
                    socketLimit: 50
                });
            expect(actual.aliasName).toEqual(GOOD_CON_CONFIG.aliasName);
            expect(actual.daysToKeep).toEqual(GOOD_CON_CONFIG.daysToKeep);
            expect(actual.minIndexesToKeep).toEqual(GOOD_STEP_CONFIG.minIndexesToKeep);
            //TODO: This will break if estools is mocked.
            expect(actual.estools.client.transport.connectionPool.connections).toHaveLength(GOOD_STEP_CONFIG.eshosts.length);
            let actualHosts = actual.estools.client.transport.connectionPool.connections.map(conn => conn.url.href);
            expect(actualHosts).toEqual(expect.arrayContaining(GOOD_STEP_CONFIG.eshosts));
            //TODO: Test socketLimit
        })

        it('throws an error on no eshosts', async() => {
            expect.assertions(1);
            try {
                await ElasticBestbetsLoader.GetInstance(
                    logger,
                    {
                        ...GOOD_STEP_CONFIG,
                        eshosts: undefined
                    }
                );
            } catch (err) {
                expect(err).toMatchObject({
                    message: "eshosts is required for the elastic loader"
                });
            }
        });

        it('throws an error on no settings', async() => {
            expect.assertions(1);
            try {
                await ElasticBestbetsLoader.GetInstance(
                    logger,
                    {
                        ...GOOD_STEP_CONFIG,
                        settingsPath: undefined
                    }
                );
            } catch (err) {
                expect(err).toMatchObject({
                    message: "settingsPath is required for the elastic loader"
                });
            }
        });

        it('throws an error on non-string settings', async() => {
            expect.assertions(1);
            try {
                await ElasticBestbetsLoader.GetInstance(
                    logger,
                    {
                        ...GOOD_STEP_CONFIG,
                        settingsPath: []
                    }
                );
            } catch (err) {
                expect(err).toMatchObject({
                    message: "settingsPath is required for the elastic loader"
                });
            }
        });

        it('throws an error on bad settings path', async() => {
            const fullPath = path.join(__dirname, '../../../', 'chicken')
            expect.assertions(1);
            try {
                await ElasticBestbetsLoader.GetInstance(
                    logger,
                    {
                        ...GOOD_STEP_CONFIG,
                        settingsPath: 'chicken'
                    }
                );
            } catch (err) {
                expect(err).toMatchObject({
                    message: `settingsPath cannot be loaded: ${fullPath}`
                });
            }
        });


        it('throws an error on no aliasName', async() => {
            expect.assertions(1);
            try {
                await ElasticBestbetsLoader.GetInstance(
                    logger,
                    {
                        ...GOOD_STEP_CONFIG,
                        aliasName: undefined
                    }
                );
            } catch (err) {
                expect(err).toMatchObject({
                    message: "aliasName is required for the elastic loader"
                });
            }
        });

        it('throws an error on non-string aliasName', async() => {
            expect.assertions(1);
            try {
                await ElasticBestbetsLoader.GetInstance(
                    logger,
                    {
                        ...GOOD_STEP_CONFIG,
                        aliasName: []
                    }
                );
            } catch (err) {
                expect(err).toMatchObject({
                    message: "aliasName is required for the elastic loader"
                });
            }
        });

        it('throws an error for non-number socketLimit', async() => {
            expect.assertions(1);
            try {
                await ElasticBestbetsLoader.GetInstance(
                    logger,
                    {
                        ...GOOD_STEP_CONFIG,
                        socketLimit: 'chicken'
                    }
                );
            } catch (err) {
                expect(err).toMatchObject({
                    message: "socketLimit must be a number greater than 0"
                });
            }
        });

        it('throws an error for negative socketLimit', async() => {
            expect.assertions(1);
            try {
                await ElasticBestbetsLoader.GetInstance(
                    logger,
                    {
                        ...GOOD_STEP_CONFIG,
                        socketLimit: -1
                    }
                );
            } catch (err) {
                expect(err).toMatchObject({
                    message: "socketLimit must be a number greater than 0"
                });
            }
        });

    })


})
