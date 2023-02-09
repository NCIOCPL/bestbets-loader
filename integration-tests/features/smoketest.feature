Feature: Simple tests to verify that the way the data shows up in Elasticsearch is unchanged.

  Background:
    * url esHost

    # Useful constants
    * def synonymRequestBody = { "query": { "term": { "record_type": "synonyms" } } }
    * def categoryDisplayRequestBody = { "query": { "term": { "record_type": "categoryDisplay" } } }

  Scenario: All the documents are loaded.

    Given path 'bestbets_v1', '_count'
    When method get
    Then status 200
    And assert response.count == 1991


  Scenario Outline: synonyms documents are distinct from categorydisplay documents.

    * def body = { "query": { "term": { "record_type": null } } }
    * body.query.term.record_type = docType

    Given path 'bestbets_v1', '_count'
    And request body
    When method get
    Then status 200
    And assert response.count == expectedCount

    Examples:
      | docType         | expectedCount |
      | synonyms        | 1737          |
      | categoryDisplay | 254           |


  Scenario: synonyms documents' hit metadata has a valid format.

    *   def body = synonymRequestBody

    Given path 'bestbets_v1', '_count'
    And request body
    When method get
    Then def size = response.count
    And response.count > 0

    Given path 'bestbets_v1', '_search'

    *   body.size = size

    And request body
    When method get
    Then status 200
    And match each $.hits.hits[*]._index == '#regex bestbets_v1_\\d{8}_\\d+'
    And match each $.hits.hits[*]._id == '#regex \\d+_\\d+'


  Scenario: Individual synonyms documents have the correct shape

    *   def body = synonymRequestBody

    Given path 'bestbets_v1', '_count'
    And request body
    When method get
    Then def size = response.count

    Given path 'bestbets_v1', '_search'
    *   body.size = size
    And request body
    When method get
    Then status 200
    And assert response.hits.total.value > 0
    And match each $.hits.hits[*]._source contains
      """
      {
        category: '#string',
        contentid: '#regex \\d+',
        synonym: '#string',
        language: '#string',
        is_negated: '#boolean',
        is_exact: '#boolean',
        tokencount: '##number',
        record_type: '#string'
      }
      """


  Scenario: Compare synonyms live fetch to a saved response.

    Given path 'bestbets_v1', '_count'
    And request synonymRequestBody
    When method get
    Then def size = response.count

    # extract just the detailed nodes.
    # NOTE: ES5 doesn't allow sort on the unique ID. Later on, we can sort in ES.
    * def blob = read('smoketest-synonyms-blob.json')
    * def sorted = karate.sort(blob.hits.hits, x => x._id)
    * def expected = get sorted[*]._source

    Given path 'bestbets_v1', '_search'
    *   def body = synonymRequestBody
    *   body.size = size
    And request body
    When method get
    Then status 200
    * def sortedResult = karate.sort(response.hits.hits, x => x._id)
    * def hits = get sortedResult[*]._source
    And match hits == expected


  Scenario: categorydisplay documents' hit metadata has a valid format.

    Given path 'bestbets_v1', '_count'
    And request categoryDisplayRequestBody
    When method get
    Then def size = response.count

    Given path 'bestbets_v1', '_search'
    *   def body = categoryDisplayRequestBody
    *   body.size = size
    And request body
    When method get
    Then status 200
    And match each $.hits.hits[*]._index == '#regex bestbets_v1_\\d{8}_\\d+'
    And match each $.hits.hits[*]._id == '#regex \\d+'


  Scenario: Individual categorydisplay documents have the correct shape

    Given path 'bestbets_v1', '_count'
    And request categoryDisplayRequestBody
    When method get
    Then def size = response.count

    Given path 'bestbets_v1', '_search'
    *   def body = categoryDisplayRequestBody
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
        content: '#string',
        record_type: '#string'
      }
      """


  Scenario: Compare categorydisplay live fetch to a saved response.

    Given path 'bestbets_v1', '_count'
    And request categoryDisplayRequestBody
    When method get
    Then def size = response.count

    # extract just the detailed nodes.
    * def blob = read('smoketest-categorydisplay-blob.json')
    * def expected = get blob.hits.hits[*]._source

    Given path 'bestbets_v1', '_search'
    *   def body = categoryDisplayRequestBody
    *   body.sort = ['contentid']
    *   body.size = size
    And request body
    When method get
    Then status 200
    *   def hits = $.hits.hits[*]._source
    And match hits == expected

