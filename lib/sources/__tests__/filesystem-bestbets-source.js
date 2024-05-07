const fsp                   = require('fs/promises');
const util                  = require('util');
const path                  = require('path');
const winston               = require('winston');
const WinstonNullTransport  = require('winston-null-transport');

const FileSystemBestbetsSource  = require('../filesystem-bestbets-source');


const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.simple(),
  transports: [
    new WinstonNullTransport()
  ]
});

const VALID_CONFIG = {
  contentPath: '../content'
};

const DATA_DIRECTORY_CONFIG = {
  contentPath: path.join('lib/sources/__tests__/data')
}

const EMPTY_DIRECTORY_CONFIG = {
  contentPath: path.join('lib/sources/__tests__/data/empty')
}

/*************
 * Expected Best Bets
 **************/
const EXPECTED_BB = Object.freeze({
  "431121": {
    categoryID: "431121",
    categoryName: "Fotos de cáncer",
    categoryWeight: 30,
    isExactMatch: true,
    language: 'es',
    display: true,
    includeSynonyms: [
      { name: "fotos", isExactMatch: false },
      { name: "imagenes", isExactMatch: false },
      { name: "fotos de cancer", isExactMatch: true },
      {
        name: "imagenes de cancer",
        isExactMatch: true
      },
      {
        name: "imágenes de cáncer",
        isExactMatch: true
      },
      {
        name: "imagenes de cáncer",
        isExactMatch: true
      },
      {
        name: "imágenes de cancer",
        isExactMatch: true
      },
      {
        name: "imágenes",
        isExactMatch: false
      },
      {
        name: "imajenes",
        isExactMatch: false
      },
      {
        name: "fotografias",
        isExactMatch: false
      },
    ],
    excludeSynonyms: [{
      name: "piel",
      isExactMatch: false
    }, ],
    categoryDisplay: "<div class=\"managed list\"><ul><li class=\"general-list-item general list-item\"><!-- cgvSnListItemGeneral --><!-- Image --><!-- End Image --><div class=\"title-and-desc title desc container\"><a class=\"title\" href=\"http://visualsonline.cancer.gov/\">Visuals Online</a><!-- start description --><div class=\"description\"><p class=\"body\">Base de datos del NCI con fotografías de médicos y científicos dedicados a la investigación del cáncer e imágenes de tratamientos de pacientes con cáncer. También se encuentran imágenes biomédicas y de ciencias, y fotos de los directores y el personal del NCI.</p></div><!-- end description --></div><!-- end title & desc container --></li></ul></div>"
  },
  "1109313": {
    categoryID: "1109313",
    categoryName: "Mantle Cell Lymphoma",
    categoryWeight: 300,
    isExactMatch: false,
    language: 'en',
    display: true,
    includeSynonyms: [],
    excludeSynonyms: [],
    categoryDisplay: "<div class=\"managed list\"><ul><li class=\"general-list-item general list-item\"><!-- cgvSnListItemGeneral --><!-- Image --><!-- End Image --><div class=\"title-and-desc title desc container\"><a class=\"title\" href=\"/types/lymphoma/patient/adult-nhl-treatment-pdq\">Adult Non-Hodgkin Lymphoma Treatment (PDQ®)–Patient Version</a><!-- start description --><div class=\"description\"><p class=\"body\">Non-Hodgkin lymphoma (NHL) options include chemotherapy, radiation, targeted therapy, plasmapheresis, surveillance, stem cell transplant, and surgery. Learn more about types of NHL and treatments in this expert-reviewed summary.</p></div><!-- end description --></div><!-- end title & desc container --></li></ul></div>"
  },
  "1045389": {
    categoryID: "1045389",
    categoryName: "Cancer Research Ideas",
    categoryWeight: 100,
    isExactMatch: false,
    language: 'en',
    display: true,
    includeSynonyms: [{
      name: "Clinical Trial Ideas",
      isExactMatch: false
    }],
    excludeSynonyms: [],
    categoryDisplay: "<div class=\"managed list\"><ul><li class=\"general-list-item general list-item\"><!-- cgvSnListItemGeneral --><!-- Image --><!-- End Image --><div class=\"title-and-desc title desc container\"><a class=\"title\" href=\"https://cancerresearchideas.cancer.gov\">Cancer Research Ideas</a><!-- start description --><div class=\"description\"><p class=\"body\">An online platform for cancer researchers to submit their best scientific ideas for bringing about a decade’s worth of advances in 5 years, making more therapies available to more patients, and spurring progress in cancer prevention, treatment, and care. </p></div><!-- end description --></div><!-- end title & desc container --></li></ul></div>"
  },
  "35884": {
    categoryID: "35884",
    categoryName: "Tobacco Control",
    categoryWeight: 110,
    isExactMatch: false,
    language: 'en',
    display: true,
    includeSynonyms: [],
    excludeSynonyms: [{
        name: "monograph",
        isExactMatch: false
      },
      {
        name: "Branch",
        isExactMatch: false
      }
    ],
    categoryDisplay: "<div class=\"managed list\"><ul><li class=\"general-list-item general list-item\"><!-- cgvSnListItemGeneral --><!-- Image --><!-- End Image --><div class=\"title-and-desc title desc container\"><a class=\"title\" href=\"https://cancercontrol.cancer.gov/brp/tcrb/monographs/\">Tobacco Control Monograph Series</a><!-- start description --><div class=\"description\"><p class=\"body\">NCI established the Tobacco Control Monograph series in 1991 to provide ongoing and timely information about emerging public health issues in smoking and tobacco use control.</p></div><!-- end description --></div><!-- end title & desc container --></li><li class=\"general-list-item general list-item\"><!-- cgvSnListItemGeneral --><!-- Image --><!-- End Image --><div class=\"title-and-desc title desc container\"><a class=\"title\" href=\"http://cancercontrol.cancer.gov/brp/tcrb/\">Tobacco Control Research Branch</a><!-- start description --><div class=\"description\"><p class=\"body\">TCRB, within NCI's Division of Cancer Control and Population Sciences, leads and collaborates on research and disseminates evidence-based findings to prevent, treat, and control tobacco use.</p></div><!-- end description --></div><!-- end title & desc container --></li></ul></div>"
  }
})


// Setup the source to test
const source = new FileSystemBestbetsSource(
  logger,
  {
    ...VALID_CONFIG
  }
)

describe('FileSystemBestbetsSource', () => {

  describe('constructor', () => {

    it('Creates with defaults', () => {
      const testsource = new FileSystemBestbetsSource(logger, {});
      expect(testsource.contentPath).toEqual("/content");
    });

    it('Creates with defaults, custom ', () => {
      const testsource = new FileSystemBestbetsSource(
        logger,
        {
          ...VALID_CONFIG,
          contentPath: '/test'
        });
      expect(testsource.contentPath).toEqual("/test");
    });

    it('trims leading/trailing spaces from the path', () => {
      const testsource = new FileSystemBestbetsSource(
        logger,
        {
          ...VALID_CONFIG,
          contentPath: '  /some-path  '
        });
      expect(testsource.contentPath).toEqual('/some-path');
    });

    it.each([
      [
          'throws an error on null resource path',
          {
              ...VALID_CONFIG,
              contentPath: null
          }
      ],
      [
          'throws an error on empy resource path',
          {
              ...VALID_CONFIG,
              contentPath: ''
          }
      ],
      [
          'throws an error on blank resource path',
          {
              ...VALID_CONFIG,
              contentPath: '    '
          }
      ]
    ])(
      '%s',
      (name, config) => {
        expect(() => {
          new FileSystemBestbetsSource(logger, config);
        }).toThrow('You must supply a file system path.');
      }
    )
  });

  describe('getContentList', () => {

    it('returns records when there are xml files', async () => {
      const source = await FileSystemBestbetsSource.GetInstance(logger, DATA_DIRECTORY_CONFIG);
      await source.begin();
      const fileList = await source.getContentList();
      await source.end();

      expect(fileList).toHaveLength(4);
      fileList.forEach( f => {
        expect(f).not.toBeNull();
        expect(f.toLowerCase().endsWith('.xml')).toBe(true);
      });
    });

    it('returns empty from directory with no markdown files', async () => {
      const source = await FileSystemBestbetsSource.GetInstance(logger, EMPTY_DIRECTORY_CONFIG);
      await source.begin();
      const fileList = await source.getContentList();
      await source.end();

      expect(fileList).toEqual([]);
    });

  });

  /**
   * Tests for fetching the raw category
   */
  describe('getContent', () => {

    //Test fetches/parsing xml
    it.each([
        [
            'complex category',
            '431121'
        ],
        [
            'simple category',
            '1109313'
        ],
        [
            'cat include, no exclude',
            '1045389'
        ],
        [
            'cat exclude, no include',
            '35884'
        ]
    ])(
        'gets %s',
        async (name, catID) => {
          const catPath = path.join(__dirname, "data", `${catID}.xml`);

          const source = new FileSystemBestbetsSource(
            logger,
            {
              ...VALID_CONFIG,
              contentPath: path.join(__dirname, 'data', `${catID}.xml`)
            }
          )

          const expected = await fsp.readFile(path.join(__dirname, "data", `${catID}.xml`), 'utf8');
          const actual = await source.getContent(catPath);

          expect(actual).toEqual(expected);
        }
    );

    it('throws on non-existant file', async () => {
      const catPath = path.join(__dirname, "data", `badfilename.xml`);

      expect.assertions(1);
      await expect(source.getContent(catPath))
        .rejects.toThrow(`Could not fetch ${catPath}`);
    });

  });


  describe('mapContentToCat', () => {

    it.each([
      [
          'complex category',
          '431121'
      ],
      [
          'simple category',
          '1109313'
      ],
      [
          'cat include, no exclude',
          '1045389'
      ],
      [
          'cat exclude, no include',
          '35884'
      ]
  ])(
    'maps content %s',
    async (name, catID) => {

      // Load the content file
      const content = await fsp.readFile(
        path.join(__dirname, ".", "data", `${catID}.xml`),
        'utf8'
      )

      // Load .json file as the expected
      const exectedContent = await fsp.readFile(path.join(__dirname, ".", "data", `${catID}.json`), 'utf8');
      const expected = JSON.parse(exectedContent);

      const actual = await source.mapContentToCat(content);

      expect({...actual, categoryDisplay: undefined}).toEqual({...expected, categoryDisplay: undefined});
      expect(actual.categoryDisplay.replace(/\s/g,'')).toEqual(expected.categoryDisplay.replace(/\s/g,''));
      expect.assertions(2);
    });

  });

  /**
   * These are the tests for the main worker function.
   */
  describe('getRecords', () => {
    it ('gets categories', async() => {

      const source = await FileSystemBestbetsSource.GetInstance(
        logger,
        {
          ...VALID_CONFIG,
          contentPath: path.join(__dirname, 'data')
        }
        );
      await source.begin();


      const actual = await source.getRecords();

      expect.assertions(9); // Total assertions for this function
      expect(actual).toHaveLength(4);
      for(let actcat of actual) {
        const expcat = EXPECTED_BB[actcat.categoryID];
        expect({...actcat, categoryDisplay: undefined}).toEqual({...expcat, categoryDisplay: undefined});
        expect(actcat.categoryDisplay.replace(/\s/g,'')).toEqual(expcat.categoryDisplay.replace(/\s/g,''));
      }

    })

  })

  describe('cleanToString', () => {
      it('cleans string', () => {
          const actual = source.cleanToString(`
          hello
          `);
          expect(actual).toBe('hello');
      });

      it('cleans wonky string', () => {
          const actual = source.cleanToString("hello");
          expect(actual).toBe('hello');
      });

      it('cleans array', () => {
          const actual = source.cleanToString(["hello"]);
          expect(actual).toBe('hello');
      });

      it('cleans empty array', () => {
          const actual = source.cleanToString([]);
          expect(actual).toBe('');
      });

      it('cleans multi array', () => {
          const actual = source.cleanToString(["hello", "goodbye"]);
          expect(actual).toBe('hello');
      });

      it('cleans wonky array', () => {
          const actual = source.cleanToString([`
          hello
          `]);
          expect(actual).toBe('hello');
      });

      it('cleans empty', () => {
          const actual = source.cleanToString("");
          expect(actual).toBe("");
      });

      it('cleans undef', () => {
          const actual = source.cleanToString(undefined);
          expect(actual).toBe("");
      });

  })

  describe('cleanToInt', () => {
      it('cleans string', () => {
          const actual = source.cleanToInt("100");
          expect(actual).toBe(100);
      });

      it('cleans wonky string', () => {
          const actual = source.cleanToInt(`
          100
          `);
          expect(actual).toBe(100);
      });

      it('cleans array', () => {
          const actual = source.cleanToInt(["30"]);
          expect(actual).toBe(30);
      });

      it('cleans empty array', () => {
          const actual = source.cleanToInt([]);
          expect(actual).toBeNaN();
      });

      it('cleans multi array', () => {
          const actual = source.cleanToInt(["30", "20"]);
          expect(actual).toBe(30);
      });

      it('cleans wonky array', () => {
          const actual = source.cleanToInt([`
          30
          `]);
          expect(actual).toBe(30);
      });

      it('cleans empty', () => {
          const actual = source.cleanToInt("");
          expect(actual).toBeNaN();
      });

      it('cleans undef', () => {
          const actual = source.cleanToInt(undefined);
          expect(actual).toBeNaN();
      });
  })

  describe('cleanToBool', () => {
      it('cleans true', () => {
          const actual = source.cleanToBool("true");
          expect(actual).toBeTruthy();
      });

      it('cleans wonky true', () => {
          const actual = source.cleanToBool(`
          true
          `);
          expect(actual).toBeTruthy();
      });

      it('cleans true array', () => {
          const actual = source.cleanToBool(["true"]);
          expect(actual).toBeTruthy();
      });

      it('cleans empty array', () => {
          const actual = source.cleanToBool([]);
          expect(actual).not.toBeTruthy();
      });

      it('cleans wonky array', () => {
          const actual = source.cleanToBool([`
          true
          `]);
          expect(actual).toBeTruthy();
      });

      it('cleans false', () => {
          const actual = source.cleanToBool("false");
          expect(actual).not.toBeTruthy();
      });

      it('cleans empty', () => {
          const actual = source.cleanToBool("");
          expect(actual).not.toBeTruthy();
      });

      it('cleans undef', () => {
          const actual = source.cleanToBool(undefined);
          expect(actual).not.toBeTruthy();
      });
  })

  describe('begin', () => {
    it('works', async () => {
      expect.assertions(0);
      await source.begin();
    })
  })

  describe('abort', () => {
    it('works', async () => {
      expect.assertions(0);
      await source.abort();
    })
  })

  describe('end', () => {
    it('works', async () => {
      expect.assertions(0);
      await source.end();
    })
  })

  describe('ValidateConfig', () => {
    it('validates config', () => {
      const actual = FileSystemBestbetsSource.ValidateConfig(VALID_CONFIG);
      expect(actual).toEqual([]);
    });

    it('errors config', () => {
      const actual = FileSystemBestbetsSource.ValidateConfig({});
      expect(actual).toEqual([new Error("You must supply a file system path.")]);
    });

  })

  describe('GetInstance', () => {
    it('gets an instance', async () => {
      const actual = await FileSystemBestbetsSource.GetInstance(logger, VALID_CONFIG);
      expect(actual.contentPath).toEqual("../content");
    });

    it('throws an error if config is not defined', async () => {
      try {
        const actual = await FileSystemBestbetsSource.GetInstance(logger);
      } catch (err) {
        expect(err).not.toBeNull();
      }
    });


  })

});
