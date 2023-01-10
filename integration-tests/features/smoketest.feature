Feature: Simple tests to verify that the way the data shows up in Elasticsearch is unchanged.

  Background:
    * url esHost

  Scenario: All the documents are loaded.

    Given path 'bestbets_v1', '_count'
    When method get
    Then status 200
    And assert response.count == 1991


  Scenario Outline: synonyms documents are distinct from categorydisplay documents.

    # Varying the path is tricky. https://stackoverflow.com/a/51362929/282194
    Given path 'bestbets_v1/' + docType + '/_count'
    When method get
    Then status 200
    And assert response.count == expectedCount

    Examples:
      | docType         | expectedCount |
      | synonyms        | 1737          |
      | categorydisplay | 254           |


  Scenario: synonyms document's hit metadata has a reasonable format.

    Given path 'bestbets_v1', 'synonyms', '_count'
    When method get
    Then def size = response.count

    Given path 'bestbets_v1', 'synonyms', '_search'
    *   def body = {}
    *   body.size = size
    And request body
    When method get
    Then status 200
    And match each $.hits.hits[*]._index == '#regex bestbets_v1_\\d{8}_\\d+'
    And match each $.hits.hits[*]._id == '#regex \\d+_\\d+'
    And match each $.hits.hits[*]._type == 'synonyms'


  Scenario: Individual synonyms documents have the correct shape

    Given path 'bestbets_v1', 'synonyms', '_count'
    When method get
    Then def size = response.count

    Given path 'bestbets_v1', 'synonyms', '_search'
    *   def body = {}
    *   body.size = size
    And request body
    When method get
    Then status 200
    And match each $.hits.hits[*]._source contains
      """
      {
        category: '#string',
        contentid: '#regex \\d+',
        synonym: '#string',
        language: '#string',
        is_negated: '#boolean',
        is_exact: '#boolean',
        tokencount: '##number'
      }
      """


  Scenario: Compare synonyms live fetch to a saved response.

    Given path 'bestbets_v1', 'synonyms', '_count'
    When method get
    Then def size = response.count

    # extract just the detailed nodes.
    # NOTE: ES5 doesn't allow sort on the unique ID. Later on, we can sort in ES.
    * def blob = read('smoketest-synonyms-blob.json')
    * def sorted = karate.sort(blob.hits.hits, x => x._id)
    * def expected = get sorted[*]._source

    Given path 'bestbets_v1', 'synonyms', '_search'
    *   def body = {}
    *   body.size = size
    And request body
    When method get
    Then status 200
    * def sortedResult = karate.sort(response.hits.hits, x => x._id)
    * def hits = get sortedResult[*]._source
    And match hits == expected


  Scenario: categorydisplay document's hit metadata has the right format.

    Given path 'bestbets_v1', 'categorydisplay', '_count'
    When method get
    Then def size = response.count

    Given path 'bestbets_v1', 'categorydisplay', '_search'
    *   def body = {}
    *   body.size = size
    And request body
    When method get
    Then status 200
    And match each $.hits.hits[*]._index == '#regex bestbets_v1_\\d{8}_\\d+'
    And match each $.hits.hits[*]._id == '#regex \\d+'
    And match each $.hits.hits[*]._type == 'categorydisplay'


  Scenario: Individual categorydisplay documents have the correct shape

    Given path 'bestbets_v1', 'categorydisplay', '_count'
    When method get
    Then def size = response.count

    Given path 'bestbets_v1', 'categorydisplay', '_search'
    *   def body = {}
    *   body.size = size
    And request body
    When method get
    Then status 200
    And match each $.hits.hits[*]._source contains
      """
      {
        contentid: '#regex \\d+',
        name: '#string',
        weight: '#number',
        content: '#string'
      }
      """


  Scenario: Compare categorydisplay live fetch to a saved response.

    Given path 'bestbets_v1', 'categorydisplay', '_count'
    When method get
    Then def size = response.count

    # extract just the detailed nodes.
    * def blob = read('smoketest-categorydisplay-blob.json')
    * def expected = get blob.hits.hits[*]._source

    Given path 'bestbets_v1', 'categorydisplay', '_search'
    *   def body = {'sort': ['contentid']}
    *   body.size = size
    And request body
    When method get
    Then status 200
    *   def hits = $.hits.hits[*]._source
    And match hits == expected

